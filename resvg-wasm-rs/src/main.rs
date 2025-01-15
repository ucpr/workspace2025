use wasmtime::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // WASM ファイルのパス
    let wasm_path = "resvg_wasm.wasm";

    // WASM エンジンとストアを初期化
    let engine = Engine::default();
    let module = Module::from_file(&engine, wasm_path)?;
    let mut store = Store::new(&engine, ());

    // Linker を作成して必要な関数を登録
    let mut linker = Linker::new(&engine);

    // `__wbindgen_placeholder__::__wbindgen_throw` の関数を登録
    linker.func_wrap(
        "__wbindgen_placeholder__",
        "__wbindgen_throw",
        |_caller: Caller<'_, ()>, ptr: i32, len: i32| {
            panic!("__wbindgen_throw was called with ptr={} len={}", ptr, len);
        },
    )?;

    // WASM モジュールのインスタンス化
    let instance = linker.instantiate(&mut store, &module)?;

    // メモリの取得
    let memory = instance
        .get_memory(&mut store, "memory")
        .expect("Memory export not found");

    // エクスポートされた `context_render` 関数を取得
    let context_render = instance
        .get_typed_func::<(i32, i32, i32, i32, i32, f64, i32, i32, i32, i32), i32>(
            &mut store,
            "context_render",
        )?;

    // 必要な引数を準備
    let arg1 = 1024; // メモリ内の SVG データ開始位置
    let arg2 = 100; // SVG データ長
    let arg3 = 0; // コンテキスト ID
    let arg4 = 0; // オプションフラグ
    let arg5 = 0; // 任意の値
    let arg6 = 0.0; // f64 型の引数
    let arg7 = 0; // 任意の値
    let arg8 = 0; // 任意の値
    let arg9 = 0; // 任意の値
    let arg10 = 0; // 任意の値

    // `context_render` 関数を呼び出す
    let result_ptr = context_render.call(
        &mut store,
        (arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10),
    )?;

    // レンダリング結果を読み取る
    let mut buffer = vec![0; 1024 * 1024]; // 1MB のバッファ
    memory.read(&store, result_ptr as usize, &mut buffer)?;

    // PNG ファイルに保存
    std::fs::write("output.png", buffer)?;

    println!("Rendered PNG saved to output.png");
    Ok(())
}
