document.addEventListener("DOMContentLoaded", () => {
  //===================1️⃣ 변수 설정==========================
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

   //<<주사위 >> //
  const rollButton = document.querySelector(".roll-dice-button");
  const diceNumber = document.querySelector(".dice-number");

    //<<미션 >> //
  const missionBox = document.querySelector(".mission-box");
  const missionList = document.querySelector(".mission-list");

  //<<마셔 / 통과 >> //
  const passBtn = document.querySelector(".pass-btn");
  const drinkBtn = document.querySelector(".drink-btn");

  const player = document.getElementById("player-data");
  const prev = player.dataset.prev;
  const current = player.dataset.current;
  const next = player.dataset.next;
  //updatePlayers(prev, current, next);

  // 방문한 칸 추적용 Set
  const visitedTiles = new Set();

  //<< 모달 >> //
  // 🧩 게임 종료 모달 요소 가져오기
  const modal = document.getElementById("endGameModal");
  const endButton = document.querySelector(".end-button");
  const continueButton = document.querySelector(".continue-button");

  //===================⏩ 모달 ===============================

  // 🧩 게임 종료 버튼 클릭 시 모달 표시
  endButton?.addEventListener("click", (e) => {
    e.preventDefault();
    modal?.classList.remove("hidden");
  });

  // 🧩 이어서 진행 클릭 시 모달 닫기
  continueButton?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });

  //===================⏩ 마셔 / 통과 ==========================
  // 1) 버튼 눌렀을 때 함수 호출
  passBtn?.addEventListener("click", () => handleAction("pass"));
  drinkBtn?.addEventListener("click", () => handleAction("drink"));

  /////----------drink 카운트------------------
  //2) 마셔 / 통과 함수
  function handleAction(actionType) {
    fetch("/handle_action/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": csrfToken,
      },
      body: `action=${actionType}`
    })
    .then(res => {
      if (!res.ok) throw new Error("❌ 서버 응답 오류");

      return res.json();
    })
    .then(data => {
      if (data.end_game) {
        window.location.href = "/end_game/";
      } else {
        // ranking
        updateRanking(data.ranking);
        //round
        updateRound(data.round);
        //player
        updatePlayers(data.prev_player, data.current_player, data.next_player);

        //hourse
        // 말 위치 다시 요청 (index 유지용)
        fetch("/move_player/?steps=0") // 0칸 이동 → 위치 정보만 받아오기
          .then(res => res.json())
          .then(data => {
            moveHorseTo(data.index);
            missionBox.innerHTML = `<h3>${data.mission}</h3>`;
          });
      }
    })
    .catch(error => console.error("에러 발생:", error));
  }

    //===================⏩ 랭킹 / 라운드 / 턴 ==========================
  /////1) ----------랭킹------------------
  function updateRanking(ranking) {
    const list = document.getElementById("ranking-list");
    list.innerHTML = "";  // 기존 삭제

    ranking.forEach((player, i) => {
      const li = document.createElement("li");
      li.classList.add("rank-card");
      if (i === 0) li.classList.add("first");
      else if (i === 1) li.classList.add("second");
      else if (i === 2) li.classList.add("third");

      const img = document.createElement("img");
      img.src = `/static/assets/icons/noto_${i + 1}-place-medal.svg`;
      img.alt = `${i + 1}등 메달`;

      const span = document.createElement("span");
      span.textContent = `${player.nickname} (${player.drink_count}잔)`;

      li.appendChild(img);
      li.appendChild(span);
      list.appendChild(li);
    });
  }

  //////////////////////////////////////////////////////////////////
  /////2) ----------라운드------------------
  function updateRound(round) {
    console.log("👉 Round update:", round);
    document.getElementById("turn-number").textContent = round;
  }

  /////3) ----------턴 플레이어------------------
  function updatePlayers(prev, current, next) {
    console.log("👉 Player update:", prev, " / ", current, " / ", next);
    document.getElementById("prev-player").textContent = prev;
    document.getElementById("current-player").textContent = current;
    document.getElementById("next-player").textContent = next;
  }

   //===================⏩ 주사위==========================
  /////---------- 주사위 ------------------
  // 1. 버튼 비활성화
  rollButton.addEventListener("click", () => {
    rollButton.disabled = true;

    // 2. 가짜 굴림 애니메이션 (랜덤 10번 바꿈)
    let count = 0;
    const max = 10;
    const interval = setInterval(() => {
      const temp = Math.floor(Math.random() * 6) + 1;
      diceNumber.textContent = temp;
      count++;
      if (count >= max) {
        clearInterval(interval);
        const final = Math.floor(Math.random() * 6) + 1;
        diceNumber.textContent = final;

        // fetch 서버로 주사위 결과 전송
        fetch(`/move_player/?steps=${final}`)
          .then(response => {
            if (!response.ok) throw new Error("서버 응답 오류");
            return response.json();
          })
          .then(data => { 
            //말이동
            moveHorseTo(data.index);

            //미션 내용 화면에 표시
            missionBox.innerHTML = `
              <h3>${data.mission ? data.mission : "에러"}</h3>
            `;
            // 도착한 칸 미션 누적 표시 (중복은 제외)
            if (data.mission && !visitedTiles.has(data.index)) {
              visitedTiles.add(data.index); // 이전에 방문하지 않은 칸일 경우만 누적

              const li = document.createElement("li");
              li.textContent = `${data.index + 1}. ${data.mission}`;
              missionList.appendChild(li);
            }
          })
          .catch(error => {
            console.error("에러:", error);
            missionBox.innerHTML = `<p>에러</p>`;
          })
          .finally(() => {
            //다시 주사위 버튼 활성화
            rollButton.disabled = false;
          });
      }
    }, 80);
  });

    //===================⏩ 말==========================
    // 타일 위치 가져오기 & 말 이동 함수
  function moveHorseTo(index) {
    console.log("👉 말 이동 함수 실행됨, index:", index);

    const tile = document.querySelector(`.tile[data-index = "${index}"]`)
    const horse = document.getElementById('horse-icon');
    if (!tile || !horse) 
      return;

    const rect = tile.getBoundingClientRect();
    console.log("top:", rect.top, "left:", rect.left);

    const tileRect = tile.getBoundingClientRect();
    const gridRect = document.querySelector('.tiles-grid').getBoundingClientRect();

    // 타일 위치를 기준으로 horse 아이콘의 위치 설정
    const offsetX = tileRect.left - gridRect.left;
    const offsetY = tileRect.top - gridRect.top;
    console.log("📍 offsetX:", offsetX, "offsetY:", offsetY);

    horse.style.left = `${offsetX + 10}px`;
    horse.style.top = `${offsetY - 50}px`;
  }

});
