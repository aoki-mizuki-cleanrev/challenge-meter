const insert_area = document.querySelector(".insert_area");
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
                    load_game(challenger_name);
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
                                let volume = Math.round(Math.sqrt(sum / dataArray.length) * 1000);
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
                                } else {
                                    console.log("10秒が経過しました。更新を停止します。");
                                    console.log("currentMaxVolume", currentMaxVolume);
                                    challengers.push({ name: challenger_name, score: currentMaxVolume });
                                    window.localStorage.setItem("challengeBarometer", JSON.stringify(challengers));
                                    // スコア渡す
                                    load_your_score(currentMaxVolume, challenger_name);
                                }
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
    document.querySelector(".cracker_container").style.display = "none";

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
            clearInterval(timer_id);

            setTimeout(() => {
                display_score.textContent = your_score; //結果出すタイミング
                // SE：クラッシュシンバル
                crash_se();

                // クラッカー
                document.querySelector(".cracker_container").style.display = "flex";
                createConfetti_r();
                createConfetti_l();
                setTimeout(() => {
                    load_ranking(your_score);
                }, 2100);
            }, 300);
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
        colors: ["#ffcc00", "#f6703bdb", "#66ff00d2", "#06cafbdb", "#fb06bed8", "#4860e8d8", "#9835e3d8", "#c0c0c0"],
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
        colors: ["#ffcc00", "#f6703bdb", "#66ff00d2", "#06cafbdb", "#fb06bed8", "#4860e8d8", "#9835e3d8", "#c0c0c0"],
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
            const rankingList = document.querySelector(".ranking_table");
            updateRanking(rankingList, your_score);

            document.querySelector(".start_btn").addEventListener("click", () => {
                const challenger_name = document.querySelector(".card_name").value;
                if (challenger_name != "") {
                    load_game(challenger_name);
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
            <div class="head_th">順位</div>
            <div class="head_th">名前</div>
            <div class="head_th">スコア</div>
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
    drum_audio.src = "./sounds/drum_roll_repeat.mp3";
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
    crash_audio.src = "./sounds/crash_cymbal.mp3";
    crash_audio.volume = 0.5;
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
