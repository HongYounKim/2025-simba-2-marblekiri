document.addEventListener("DOMContentLoaded", () => {
  //===================1️⃣ 변수 설정==========================
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

  //<<주사위 >> //
  const rollButton = document.querySelector(".roll-dice-button");
  const diceNumber = document.querySelector(".dice-number");

  // 버튼 연결 확인
  if (!rollButton) {
    console.error("❌ 버튼 요소를 찾을 수 없습니다.");
    return;
  }

  //<<미션 >> //
  const missionBox = document.querySelector(".mission-box");
  const missionList = document.querySelector(".mission-list");

  //<<마셔 / 통과 >> //
  const passBtn = document.querySelector(".pass-btn");
  const drinkBtn = document.querySelector(".drink-btn");

  // 방문한 칸 추적용 Set
  const visitedTiles = new Set();

  //<< 모달 >> //
  const modal = document.getElementById("endGameModal");
  const endButton = document.querySelector(".end-button");              // 상단의 "게임 종료" 버튼
  const continueButton = document.querySelector(".continue-button");    // 모달의 "이어서 진행" 버튼
  const endGameConfirmButton = document.querySelector(".end-button-modal"); // 모달의 "게임 종료" 버튼

  //<< 말 위치 조정 >>
  moveHorseStepByStep(0, 0)

  //===================⏩ 모달 ===============================

  // 🧩 상단 "게임 종료" 버튼 클릭 시 → 모달 열기
  endButton?.addEventListener("click", (e) => {
    e.preventDefault();
    modal?.classList.remove("hidden");
  });

  // 🧩 모달에서 "이어서 진행" 클릭 시 → 모달 닫기
  continueButton?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });

  // ✅ 모달에서 "게임 종료" 버튼 클릭 시 → 페이지 이동
  const endGameURL = endGameConfirmButton?.dataset.url;
  endGameConfirmButton?.addEventListener("click", () => {
    console.log("종료 버튼 클릭 됌")
    if (endGameURL) {
      window.location.href = endGameURL;
    }
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
        const show_ranking = document.getElementById("show-ranking-hidden")?.value === "true";
        console.log("✅ show_ranking:", show_ranking);
        if (show_ranking){
          updateRanking(data.ranking);
        }
        //round
        updateRound(data.round);
        //player
        updatePlayers(data.prev_player, data.current_player, data.next_player);

        // 말 위치 다시 요청 (index 유지용)
        fetch("/move_player/?steps=0") // 0칸 이동 → 위치 정보만 받아오기
          .then(res => res.json())
          .then(data => { 
            // 말 이동 (한 칸씩 애니메이션)
            moveHorseStepByStep(data.prev_index, data.index); 
            missionBox.innerHTML = `<h3>${data.mission}</h3>`;
          });

        // 마셔 / 통과 누른 후 다시 비활성화
        passBtn.disabled = true;
        drinkBtn.disabled = true;

        //주사위 활성화
        rollButton.disabled = false;
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
  let isRolling = false;

  rollButton.addEventListener("click", () => {
    if (isRolling) return;
    if (rollButton.disabled) return;

    isRolling = true;
    console.log("🎲 주사위 시작");
    rollButton.disabled = true;

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

        fetch(`/move_player/?steps=${final}`)
          .then(response => {
            if (!response.ok) throw new Error("서버 응답 오류");
            return response.json();
          })
          .then(data => { 
            moveHorseStepByStep(data.prev_index, data.index); // ✅ 수정: moveHorseTo → moveHorseStepByStep로 통일

            missionBox.innerHTML = `
              <h3>${data.mission ? data.mission : "에러"}</h3>
            `;

            if (data.mission && !visitedTiles.has(data.index)) {
              visitedTiles.add(data.index);
              const li = document.createElement("li");
              li.textContent = `${data.index + 1}. ${data.mission}`;
              missionList.appendChild(li);
            }

            passBtn.disabled = false;
            drinkBtn.disabled = false;
          })
          .catch(error => {
            console.error("에러:", error);
            missionBox.innerHTML = `<p>에러</p>`;
          })
          .finally(() => {
            console.log("✅ 주사위 끝");
            isRolling = false;
          });
      }
    }, 80);
  });

  //===================⏩ 말 이동 ==========================
  function moveHorseStepByStep(startIndex, endIndex) {
    console.log("🐴 말 이동 시작");
    const totalTiles = 20;
    const steps = [];
    let current = startIndex;

    while (current !== endIndex) {
      current = (current + 1) % totalTiles;
      steps.push(current);
    }

    let i = 0;
    const horse = document.getElementById("horse-icon");

    function moveStep() {
      if (i >= steps.length) return;
      const tile = document.querySelector(`.tile[data-index="${steps[i]}"]`);
      const tileRect = tile.getBoundingClientRect();
      const gridRect = document.querySelector(".tiles-grid").getBoundingClientRect();

      const offsetX = tileRect.left - gridRect.left;
      const offsetY = tileRect.top - gridRect.top;

      horse.style.left = `${offsetX + 10}px`;
      horse.style.top = `${offsetY - 50}px`;

      i++;
      setTimeout(moveStep, 180);
    }

    moveStep();
  }
});