const insert_area = document.querySelector(".container");
var challengers = JSON.parse(window.localStorage.getItem("challengeBarometer")) ?? [];
const CHALLENGE_TIME = 5000; //秒: 1000 -> 1sec
// const CHALLENGE_TIME = 20000; //秒: 1000 -> 1sec

// ============

function load_top() {
    fetch("./components/top.html")
        .then((res) => {
            if (res.ok) {
                return res.text();
            } else {
                throw new Error("Network response was not ok");
            }
        })
        .then((html_data) => {
            insert_area.innerHTML = html_data;

            // DEBUG
            const is_localstorage = JSON.parse(window.localStorage.getItem("challengeBarometer"));
            console.log(is_localstorage == null ? "---ランキングデータはリセットされています---" : "--データあります--");

            document.querySelector(".start_btn").addEventListener("click", () => {
                const challenger_name = document.querySelector(".card_name").value;
                if (challenger_name != "") {
                    load_challenger(challenger_name);
                } else {
                    alert("名前を入力してください！");
                    return;
                }
            });
        })
        .catch((er) => console.error("Error!", er));
}
load_top();
// ----------------------------------------------
// 利用可能なカメラデバイスを取得し、セレクトボックスに登録する関数
async function populateCameraSelect() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === "videoinput");

        // 外部カメラを優先するため、内蔵カメラと思われるもの（ラベルに "内蔵" や "Built-in" を含む）を後ろに並べ替え
        const pattern = /内蔵|builtin|built-in|MacBook Proカメラ \(0000:0001\)/i;

        videoDevices.sort((a, b) => {
            const isAInternal = pattern.test(a.label);
            const isBInternal = pattern.test(b.label);
            if (isAInternal === isBInternal) {
                // 両者が同じ種類の場合は、ラベル順でソート
                return a.label.localeCompare(b.label);
            }
            // 内蔵なら 1、外部なら -1 を返す（つまり、外部が上位）
            return isAInternal ? 1 : -1;
        });
        console.log(videoDevices);
        const cameraSelect = document.getElementById("cameraSelect");
        cameraSelect.innerHTML = "";

        videoDevices.forEach((device, index) => {
            const option = document.createElement("option");
            option.value = device.deviceId;
            option.text = device.label || `カメラ ${index + 1}`;
            cameraSelect.appendChild(option);
        });
    } catch (error) {
        console.error("カメラデバイスの取得に失敗しました:", error);
    }
}

// Webカメラの映像を取得して video 要素に流し込む関数
async function startWebcam(deviceId) {
    try {
        console.log("カメラ開始:", deviceId);
        // deviceId が指定されていればそのカメラを使用、指定がなければデフォルトのカメラを利用
        const constraints = {
            video: deviceId ? { deviceId: { exact: deviceId } } : true,
            audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById("video");
        video.srcObject = stream;
        return stream;
    } catch (err) {
        console.error("Webカメラへのアクセスに失敗しました:", err);
        alert("Webカメラへのアクセスが拒否されました。");
    }
}

// カメラ切り替え処理（セレクトボックスの変更時に実行）
async function switchCamera() {
    // 既にストリームがある場合は全トラックを停止してリソースを解放
    if (window.currentStream) {
        window.currentStream.getTracks().forEach((track) => track.stop());
    }
    const selectedDeviceId = document.getElementById("cameraSelect").value;
    window.currentStream = await startWebcam(selectedDeviceId);
}

// 初期化処理：カメラ一覧の取得と初期カメラの起動
async function init() {
    await populateCameraSelect();
    const cameraSelect = document.getElementById("cameraSelect");
    if (cameraSelect.options.length > 0) {
        // セレクトボックスの最初の項目（外部カメラがあれば優先して上位に来る）を利用してカメラを開始
        window.currentStream = await startWebcam(cameraSelect.options[0].value);
    } else {
        console.error("利用可能なカメラが見つかりません。");
    }
}
// ----------------------------------------------

function load_challenger(challenger_name) {
    fetch("./components/challenger.html")
        .then((res) => {
            if (res.ok) {
                return res.text();
            } else {
                throw new Error("Network response was not ok");
            }
        })
        .then((html_data) => {
            insert_area.innerHTML = html_data;
            // document.querySelector(".container").classList.toggle("top");
            let cd = 1;
            init();
            document.getElementById("cameraSelect").addEventListener("change", switchCamera);

            setTimeout(() => {
                document.querySelector(".challenger_cover").style.display = "block";
            }, 1000);
            // setTimeout(() => {
            //     load_game(challenger_name);
            // }, 20000);
            document.querySelector("#js_next_button").addEventListener("click", () => {
                load_game(challenger_name);
            });
        })
        .catch((er) => console.error("Error!", er));
}
// ----------------------------------------------
function load_game(challenger_name) {
    fetch("./components/game.html")
        .then((res) => {
            if (res.ok) {
                return res.text();
            } else {
                throw new Error("Network response was not ok");
            }
        })
        .then((html_data) => {
            insert_area.innerHTML = html_data;
            // document.querySelector(".container").classList.toggle("top");
            let cd = 1;

            //CountDown
            const timer_id = setInterval(() => {
                document.querySelector("#js_countdown").textContent -= cd;
                if (document.querySelector("#js_countdown").textContent == 0) {
                    clearInterval(timer_id);

                    // 表示切り替え
                    document.querySelector("#js_countdown").style.display = "none";
                    document.querySelector(".game_container").style.display = "block";
                    document.querySelector(".game_time_countdown").style.display = "flex";

                    // mic
                    let bar = document.querySelector("#js_volume_bar");
                    const point = document.querySelector("#js_point");

                    navigator.mediaDevices
                        .getUserMedia({ audio: true, video: false })
                        .then((stream) => {
                            // AudioContext を作成
                            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                            // ストリームから音声ソースを作成
                            const microphone = audioContext.createMediaStreamSource(stream);
                            // AnalyserNode を作成
                            const analyser = audioContext.createAnalyser();
                            analyser.fftSize = 2048; // FFTサイズ（任意の値）
                            // マイクのソースをアナライザに接続
                            microphone.connect(analyser);

                            // 時間領域のデータを受け取るための Uint8Array を作成
                            const dataArray = new Uint8Array(analyser.fftSize);

                            // 10秒間の計測を開始するための開始時刻を記録
                            const startTime = Date.now();

                            // リアルタイムに音量を取得してコンソールに表示する関数
                            currentMaxVolume = 0;
                            function updateVolume() {
                                // 時間領域のデータを取得（値は 0～255 の範囲、中央が128）
                                analyser.getByteTimeDomainData(dataArray);

                                // RMS（Root Mean Square：実効値）を計算して音量を取得
                                let sum = 0;
                                for (let i = 0; i < dataArray.length; i++) {
                                    // 128 を基準に -1～1 の値に変換
                                    let normalized = (dataArray[i] - 128) / 128;
                                    sum += normalized * normalized;
                                }
                                const rms = Math.sqrt(sum / dataArray.length);
                                let volume = Math.round(Math.sqrt(sum / dataArray.length) * 10000);
                                // rms の値が音量の目安（0～1程度の範囲）
                                // console.log("Volume:", rms);
                                bar.style.width = rms * 500 + "%";
                                if (volume > currentMaxVolume) {
                                    currentMaxVolume = volume;
                                }
                                point.textContent = volume;
                                // console.log("currentMaxVolume", currentMaxVolume);

                                // 10秒以内であれば更新を続ける
                                if (Date.now() - startTime < CHALLENGE_TIME) {
                                    requestAnimationFrame(updateVolume);
                                    document.querySelector(".game_time_countdown").textContent =
                                        CHALLENGE_TIME * 0.001 - parseInt((Date.now() - startTime) * 0.001);
                                } else {
                                    console.log("10秒が経過しました。更新を停止します。");
                                    console.log("currentMaxVolume", currentMaxVolume);
                                    challengers.push({ name: challenger_name, score: currentMaxVolume });
                                    window.localStorage.setItem("challengeBarometer", JSON.stringify(challengers));
                                    // スコア渡す
                                    load_your_score(currentMaxVolume, challenger_name);
                                }
                                //Debug
                                // requestAnimationFrame(updateVolume);
                            }

                            // 音量取得のループ開始
                            updateVolume();
                        })
                        .catch((err) => {
                            console.error("マイクのアクセスに失敗しました:", err);
                        });
                }
            }, 1000);
        })
        .catch((er) => console.error("Error!", er));
}
// ----------------------------------------------
function load_your_score(your_score, challenger_name) {
    fetch("./components/your_score.html")
        .then((res) => {
            if (res.ok) {
                return res.text();
            } else {
                throw new Error("Network response was not ok");
            }
        })
        .then((html_data) => {
            insert_area.innerHTML = html_data;
            document.querySelector(".container").classList.toggle("top");
            // challenger-name
            document.querySelector("#js_challenger_name").textContent = challenger_name;
            // SE：ドラムロール
            drum_se(true);
            result_score(your_score);
        })
        .catch((er) => console.error("Error!", er));
}
// ----------------------------------------------
function result_score(your_score) {
    const display_score = document.getElementById("js_score");
    // document.querySelector(".cracker_container").style.display = "none";

    // btn.disabled = true;
    var i = 0;
    const DRUM_ROLL_INTERVAL = 2000;
    const DEFAULT_COUNT = 999;
    const timer_id = setInterval(() => {
        display_score.textContent = i;
        i++;
        if (i > DEFAULT_COUNT) {
            // SE：ドラムロール止め
            drum_se(false);
            document.querySelector(".light_cover").classList.add("visible");
            // SE：クラッシュシンバル
            clearInterval(timer_id);
            crash_se();
            setTimeout(() => {
                display_score.textContent = your_score; //結果出すタイミング
                // クラッカー
                // document.querySelector(".cracker_container").style.display = "flex";
                createConfetti_r();
                createConfetti_l();
                setTimeout(() => {
                    load_ranking(your_score);
                }, 2100);
            }, 200);
        }
    }, DRUM_ROLL_INTERVAL / DEFAULT_COUNT);
    // btn.disabled = false;
}

// クラッカー ----------------------------------------
function createConfetti_r() {
    confetti({
        particleCount: 80,
        spread: 75,
        ticks: 385,
        colors: ["#f6f342db", "#531ef3f4", "#a6f51fd2", "#06cafbdb", "#fb06bed8", "#ef2d57d8", "#4860e8d8", "#ffffff"],
        angle: 130, // 紙吹雪が飛ぶ方向（指定しないと90＝上向き）
        startVelocity: 70, // 紙吹雪が上に飛ぶ速度
        scalar: 1, // 紙吹雪の大きさ
        gravity: 0.8, // 重力 （0にすると紙吹雪が落ちない）
        origin: {
            x: 1, // 紙吹雪の発生場所（両方とも0．5にすると中央）
            y: 1,
        },
    });
}
function createConfetti_l() {
    confetti({
        particleCount: 80,
        spread: 75,
        ticks: 385,
        colors: ["#f6f342db", "#531ef3f4", "#a6f51fd2", "#06cafbdb", "#fb06bed8", "#ef2d57d8", "#4860e8d8", "#ffffff"],
        angle: 40, // 紙吹雪が飛ぶ方向（指定しないと90＝上向き）
        startVelocity: 70, // 紙吹雪が上に飛ぶ速度
        scalar: 1, // 紙吹雪の大きさ
        gravity: 0.6, // 重力 （0にすると紙吹雪が落ちない）
        origin: {
            x: 0, // 紙吹雪の発生場所（両方とも0．5にすると中央）
            y: 1,
        },
    });
}
// -----------------------------------------------------

function load_ranking(your_score) {
    fetch("./components/ranking_restart.html")
        .then((res) => {
            if (res.ok) {
                return res.text();
            } else {
                throw new Error("Network response was not ok");
            }
        })
        .then((html_data) => {
            insert_area.innerHTML = html_data;
            document.querySelector(".container").classList.toggle("top");
            document.querySelector(".container").classList.toggle("ranking");
            const rankingList = document.querySelector(".ranking_table");
            updateRanking(rankingList, your_score);

            document.querySelector(".start_btn").addEventListener("click", () => {
                const challenger_name = document.querySelector(".card_name").value;
                if (challenger_name != "") {
                    load_challenger(challenger_name);
                } else {
                    alert("名前を入力してください！");
                    return;
                }
            });
        })
        .catch((er) => console.error("Error!", er));
}

function updateRanking(rankingList, your_score) {
    challengers_local = JSON.parse(window.localStorage.getItem("challengeBarometer"));
    rankingList.innerHTML =
        `<li>
			<div class="head_th">Rank</div>
			<div class="head_th">Name</div>
			<div class="head_th">Score</div>
        </li>` +
        challengers_local
            .sort((a, b) => b.score - a.score)
            .map(
                (c, index) =>
                    `<li class="${c.score == your_score ? "challenge_score" : ""}"><div class="td">${index + 1}</div><div class="td">${
                        c.name
                    }</div><div class="td">${c.score}</div></li>`
            )
            .join("");
}

function resetLocalStorage() {
    window.localStorage.removeItem("challengeBarometer");
    console.log("ローカルストレージがリセットされました");
}

// -----------------------------------------------------
const drum_audio = new Audio();
const crash_audio = new Audio();
function drum_se(play_status) {
    drum_audio.src = "./sounds/8bit_countup.mp3";
    drum_audio.volume = 0.4;
    drum_audio.loop = true;

    if (play_status == true) {
        console.log("play");
        drum_audio.play();
    } else {
        drum_audio.pause();
    }
}
function crash_se() {
    crash_audio.src = "./sounds/ele_restraint.mp3";
    crash_audio.volume = 1;
    crash_audio.loop = false;
    crash_audio.play();
}

function debug_screen(screen) {
    switch (screen) {
        case "game":
            load_game("test");
            break;
        case "score":
            php_file = "your_score.html";
            load_your_score(9999, "test");
            break;
        case "ranking":
            php_file = "ranking_restart.html";
            load_ranking(9999);
            break;
        default:
            php_file = "ranking_restart.html";
            load_ranking(9999);
            break;
    }
}
