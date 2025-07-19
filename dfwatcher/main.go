package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/charmbracelet/bubbles/table"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/fsnotify/fsnotify"
)

var (
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#FAFAFA")).
			Background(lipgloss.Color("#7D56F4")).
			PaddingTop(0).
			PaddingBottom(0).
			PaddingLeft(1).
			PaddingRight(1)

	diffHeaderStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#FAFAFA")).
			Background(lipgloss.Color("#3D3D3D")).
			PaddingTop(0).
			PaddingBottom(0).
			PaddingLeft(1).
			PaddingRight(1)

	addedLineStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#00FF00"))

	removedLineStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#FF0000"))

	lineNumberStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#808080"))

	packageStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FF8700"))

	stringStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#87FF00"))

	keywordStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FF00FF"))

	funcStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#00FFFF"))
)

type fileEvent struct {
	Time  time.Time
	Event string
	File  string
}

type model struct {
	watchDir     string
	viewport     viewport.Model
	table        table.Model
	width        int
	height       int
	diff         string
	events       []fileEvent
	eventsMutex  sync.RWMutex
	ready        bool
	lastModified string
}

func (m model) Init() tea.Cmd {
	return tea.Batch(
		watchDirectory(m.watchDir),
		tick(),
	)
}

func tick() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

type tickMsg time.Time

type diffUpdateMsg struct {
	diff         string
	lastModified string
}

type fileEventMsg struct {
	event fileEvent
}

var program *tea.Program

func watchDirectory(dir string) tea.Cmd {
	return func() tea.Msg {
		watcher, err := fsnotify.NewWatcher()
		if err != nil {
			return errMsg{err}
		}

		eventChan := make(chan fileEvent)

		go func() {
			defer watcher.Close()
			for {
				select {
				case event, ok := <-watcher.Events:
					if !ok {
						return
					}
					if event.Op&fsnotify.Write == fsnotify.Write ||
						event.Op&fsnotify.Create == fsnotify.Create ||
						event.Op&fsnotify.Remove == fsnotify.Remove {
						relPath, _ := filepath.Rel(dir, event.Name)
						if strings.HasPrefix(relPath, ".git/") {
							continue
						}

						eventType := "modified"
						if event.Op&fsnotify.Create == fsnotify.Create {
							eventType = "created"
						} else if event.Op&fsnotify.Remove == fsnotify.Remove {
							eventType = "deleted"
						}

						fe := fileEvent{
							Time:  time.Now(),
							Event: eventType,
							File:  relPath,
						}
						eventChan <- fe
					}
				case err, ok := <-watcher.Errors:
					if !ok {
						return
					}
					log.Println("error:", err)
				}
			}
		}()

		go func() {
			for fe := range eventChan {
				if program != nil {
					program.Send(fileEventMsg{event: fe})
				}
			}
		}()

		err = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() {
				return nil
			}
			if strings.Contains(path, ".git") {
				return nil
			}
			return watcher.Add(path)
		})
		if err != nil {
			return errMsg{err}
		}

		return nil
	}
}

func getDiff(dir string) (string, string) {
	cmd := exec.Command("git", "diff", "--color=never")
	cmd.Dir = dir
	output, err := cmd.Output()
	if err != nil {
		return "Error getting diff: " + err.Error(), ""
	}

	cmd = exec.Command("git", "status", "--porcelain")
	cmd.Dir = dir
	statusOutput, _ := cmd.Output()

	var lastModified string
	if len(statusOutput) > 0 {
		lines := strings.Split(string(statusOutput), "\n")
		for _, line := range lines {
			if len(line) > 3 {
				lastModified = strings.TrimSpace(line[3:])
				break
			}
		}
	}

	return string(output), lastModified
}

func syntaxHighlight(line string) string {
	if strings.HasPrefix(line, "package ") {
		return packageStyle.Render("package") + " " + line[8:]
	}

	if strings.HasPrefix(line, "import ") {
		return keywordStyle.Render("import") + " " + line[7:]
	}

	if strings.HasPrefix(line, "func ") {
		parts := strings.SplitN(line, "(", 2)
		if len(parts) > 1 {
			funcName := strings.TrimPrefix(parts[0], "func ")
			return keywordStyle.Render("func") + " " + funcStyle.Render(funcName) + "(" + parts[1]
		}
		return keywordStyle.Render("func") + " " + line[5:]
	}

	keywords := []string{"if", "else", "for", "return", "var", "const", "type", "struct", "interface"}
	for _, kw := range keywords {
		if strings.Contains(line, kw+" ") {
			line = strings.ReplaceAll(line, kw+" ", keywordStyle.Render(kw)+" ")
		}
	}

	inString := false
	var result strings.Builder
	for i, ch := range line {
		if ch == '"' && (i == 0 || line[i-1] != '\\') {
			if !inString {
				result.WriteString(stringStyle.Render("\""))
				inString = true
			} else {
				result.WriteString(stringStyle.Render("\""))
				inString = false
			}
		} else if inString {
			result.WriteString(stringStyle.Render(string(ch)))
		} else {
			result.WriteRune(ch)
		}
	}

	return result.String()
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var (
		cmd  tea.Cmd
		cmds []tea.Cmd
	)

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		}

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height

		headerHeight := 3
		tableHeight := 10

		if !m.ready {
			m.viewport = viewport.New(m.width, m.height-headerHeight-tableHeight)
			m.viewport.YPosition = headerHeight
			m.ready = true
		} else {
			m.viewport.Width = m.width
			m.viewport.Height = m.height - headerHeight - tableHeight
		}

		m.table.SetWidth(m.width)
		m.table.SetHeight(tableHeight - 2)

	case fileEventMsg:
		m.eventsMutex.Lock()
		m.events = append([]fileEvent{msg.event}, m.events...)
		if len(m.events) > 20 {
			m.events = m.events[:20]
		}
		m.eventsMutex.Unlock()
		m.updateTable()

		diff, lastModified := getDiff(m.watchDir)
		return m, func() tea.Msg {
			return diffUpdateMsg{diff: diff, lastModified: lastModified}
		}

	case diffUpdateMsg:
		m.diff = msg.diff
		m.lastModified = msg.lastModified
		m.updateDiffView()

	case tickMsg:
		diff, lastModified := getDiff(m.watchDir)
		if diff != m.diff {
			m.diff = diff
			m.lastModified = lastModified
			m.updateDiffView()
		}
		return m, tick()

	case errMsg:
		m.diff = fmt.Sprintf("Error: %v", msg.err)
		m.updateDiffView()
	}

	m.viewport, cmd = m.viewport.Update(msg)
	cmds = append(cmds, cmd)

	m.table, cmd = m.table.Update(msg)
	cmds = append(cmds, cmd)

	return m, tea.Batch(cmds...)
}

func (m *model) updateDiffView() {
	lines := strings.Split(m.diff, "\n")
	var content strings.Builder

	header := fmt.Sprintf("Recent Diffs")
	if m.lastModified != "" {
		header = fmt.Sprintf("Recent Diffs - %s", m.lastModified)
	}
	content.WriteString(diffHeaderStyle.Render(header) + "\n")

	content.WriteString(fmt.Sprintf("--- %s\n", m.watchDir))
	content.WriteString("+++ /dev/null\n")

	lineNum := 1
	for _, line := range lines {
		if strings.HasPrefix(line, "diff --git") {
			content.WriteString("\n" + line + "\n")
		} else if strings.HasPrefix(line, "---") || strings.HasPrefix(line, "+++") {
			content.WriteString(line + "\n")
		} else if strings.HasPrefix(line, "@@") {
			content.WriteString(lineNumberStyle.Render(line) + "\n")
		} else if strings.HasPrefix(line, "+") && !strings.HasPrefix(line, "+++") {
			highlighted := syntaxHighlight(strings.TrimPrefix(line, "+"))
			content.WriteString(addedLineStyle.Render("+") + highlighted + "\n")
			lineNum++
		} else if strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "---") {
			highlighted := syntaxHighlight(strings.TrimPrefix(line, "-"))
			content.WriteString(removedLineStyle.Render("-") + highlighted + "\n")
		} else {
			lineNumStr := fmt.Sprintf("%d", lineNum)
			highlighted := syntaxHighlight(line)
			content.WriteString(lineNumberStyle.Render(fmt.Sprintf("%-4s", lineNumStr)) + highlighted + "\n")
			if line != "" && !strings.HasPrefix(line, "@@") {
				lineNum++
			}
		}
	}

	m.viewport.SetContent(content.String())
}

func (m *model) updateTable() {
	m.eventsMutex.RLock()
	events := make([]fileEvent, len(m.events))
	copy(events, m.events)
	m.eventsMutex.RUnlock()

	rows := []table.Row{}
	for _, event := range events {
		rows = append(rows, table.Row{
			event.Time.Format("15:04:05"),
			event.Event,
			event.File,
		})
	}

	m.table.SetRows(rows)
}

func (m model) View() string {
	if !m.ready {
		return "\n  Initializing..."
	}

	title := titleStyle.Render(fmt.Sprintf("dfwatcher - %s", m.watchDir))

	return lipgloss.JoinVertical(
		lipgloss.Left,
		title,
		m.viewport.View(),
		"\n"+m.table.View(),
	)
}

type errMsg struct {
	err error
}

func main() {
	dir := "."
	if len(os.Args) > 1 {
		dir = os.Args[1]
	}

	absDir, err := filepath.Abs(dir)
	if err != nil {
		log.Fatal(err)
	}

	columns := []table.Column{
		{Title: "Time", Width: 10},
		{Title: "Event", Width: 10},
		{Title: "File", Width: 50},
	}

	t := table.New(
		table.WithColumns(columns),
		table.WithFocused(false),
		table.WithHeight(8),
	)

	s := table.DefaultStyles()
	s.Header = s.Header.
		BorderStyle(lipgloss.NormalBorder()).
		BorderForeground(lipgloss.Color("240")).
		BorderBottom(true).
		Bold(false)
	s.Selected = s.Selected.
		Foreground(lipgloss.Color("229")).
		Background(lipgloss.Color("57")).
		Bold(false)
	t.SetStyles(s)

	initialModel := model{
		watchDir: absDir,
		table:    t,
		events:   []fileEvent{},
	}

	program = tea.NewProgram(
		initialModel,
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)

	if _, err := program.Run(); err != nil {
		log.Fatal(err)
	}
}

