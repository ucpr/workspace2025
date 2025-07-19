# dfwatcher

ディレクトリ内のファイル変更を監視し、Git diffと変更履歴をリアルタイムで表示するTUIツール。

## 機能

- ファイルシステムの変更をリアルタイム監視
- Git diffの表示（シンタックスハイライト付き）
- 変更履歴のテーブル表示
- 見やすいTUIインターフェース

## インストール

```bash
go install github.com/ucpr/workspace2025/dfwatcher@latest
```

## 使用方法

```bash
# カレントディレクトリを監視
dfwatcher

# 特定のディレクトリを監視
dfwatcher /path/to/directory
```

## キーボードショートカット

- `q` または `Ctrl+C`: 終了

## 画面構成

- 上部: Git diffの表示（追加行は緑、削除行は赤で表示）
- 下部: ファイル変更履歴テーブル（時刻、イベント種別、ファイル名）

## 注意事項

- Gitリポジトリ内で使用することを想定しています
- `.git`ディレクトリ内の変更は無視されます