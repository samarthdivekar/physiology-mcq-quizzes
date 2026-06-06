const state = {
  all: [],
  visible: [],
  current: 0,
  answers: new Map(),
};

const els = {
  questionCount: document.querySelector("#questionCount"),
  filteredCount: document.querySelector("#filteredCount"),
  score: document.querySelector("#score"),
  search: document.querySelector("#search"),
  shuffle: document.querySelector("#shuffle"),
  reset: document.querySelector("#reset"),
  position: document.querySelector("#position"),
  page: document.querySelector("#page"),
  questionText: document.querySelector("#questionText"),
  options: document.querySelector("#options"),
  answerBox: document.querySelector("#answerBox"),
  previous: document.querySelector("#previous"),
  next: document.querySelector("#next"),
  questionList: document.querySelector("#questionList"),
};

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

async function loadQuestions() {
  const response = await fetch("data/questions.json");
  if (!response.ok) {
    throw new Error("Could not load data/questions.json");
  }
  state.all = await response.json();
  state.visible = [...state.all];
  restoreAnswers();
  render();
}

function restoreAnswers() {
  try {
    const saved = JSON.parse(localStorage.getItem("physiologyQuizAnswers") || "{}");
    state.answers = new Map(Object.entries(saved).map(([id, value]) => [Number(id), value]));
  } catch {
    state.answers = new Map();
  }
}

function saveAnswers() {
  localStorage.setItem(
    "physiologyQuizAnswers",
    JSON.stringify(Object.fromEntries(state.answers))
  );
}

function render() {
  if (!state.visible.length) {
    els.questionText.textContent = "No questions match your search.";
    els.options.innerHTML = "";
    els.answerBox.hidden = true;
    els.position.textContent = "Question 0";
    els.page.textContent = "Page -";
    renderStats();
    renderList();
    return;
  }

  state.current = Math.max(0, Math.min(state.current, state.visible.length - 1));
  const question = state.visible[state.current];
  const selected = state.answers.get(question.id);

  els.position.textContent = `Question ${state.current + 1} of ${state.visible.length}`;
  els.page.textContent = `PDF page ${question.page}`;
  els.questionText.textContent = question.question;
  els.options.innerHTML = "";

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option";
    button.disabled = selected !== undefined;
    button.innerHTML = `<span class="option-letter">${letters[index]}</span><span>${escapeHtml(option)}</span>`;
    button.addEventListener("click", () => chooseAnswer(question, index));

    if (selected !== undefined) {
      if (index === question.answerIndex) button.classList.add("correct");
      if (index === selected && selected !== question.answerIndex) button.classList.add("wrong");
    }

    els.options.appendChild(button);
  });

  if (selected !== undefined) {
    const result = selected === question.answerIndex ? "Correct" : "Incorrect";
    els.answerBox.hidden = false;
    els.answerBox.innerHTML = `<strong>${result}.</strong> Answer: ${letters[question.answerIndex]}. ${escapeHtml(question.answer)}`;
  } else {
    els.answerBox.hidden = true;
    els.answerBox.textContent = "";
  }

  els.previous.disabled = state.current === 0;
  els.next.disabled = state.current === state.visible.length - 1;
  renderStats();
  renderList();
}

function renderStats() {
  const answered = [...state.answers.keys()].filter((id) =>
    state.all.some((question) => question.id === id)
  ).length;
  const correct = state.all.reduce((total, question) => {
    return total + (state.answers.get(question.id) === question.answerIndex ? 1 : 0);
  }, 0);

  els.questionCount.textContent = `${state.all.length} questions`;
  els.filteredCount.textContent = `${state.visible.length} shown`;
  els.score.textContent = `Score ${correct}/${answered}`;
}

function renderList() {
  els.questionList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  state.visible.forEach((question, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "jump";
    if (index === state.current) button.classList.add("active");
    if (state.answers.has(question.id)) button.classList.add("answered");
    button.textContent = String(index + 1);
    button.addEventListener("click", () => {
      state.current = index;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    fragment.appendChild(button);
  });

  els.questionList.appendChild(fragment);
}

function chooseAnswer(question, index) {
  state.answers.set(question.id, index);
  saveAnswers();
  render();
}

function applySearch() {
  const query = els.search.value.trim().toLowerCase();
  state.visible = query
    ? state.all.filter((question) => {
        const haystack = [question.question, ...question.options].join(" ").toLowerCase();
        return haystack.includes(query);
      })
    : [...state.all];
  state.current = 0;
  render();
}

function shuffleVisible() {
  for (let index = state.visible.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [state.visible[index], state.visible[swapIndex]] = [
      state.visible[swapIndex],
      state.visible[index],
    ];
  }
  state.current = 0;
  render();
}

function resetQuiz() {
  state.answers.clear();
  saveAnswers();
  render();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char];
  });
}

els.search.addEventListener("input", applySearch);
els.shuffle.addEventListener("click", shuffleVisible);
els.reset.addEventListener("click", resetQuiz);
els.previous.addEventListener("click", () => {
  state.current -= 1;
  render();
});
els.next.addEventListener("click", () => {
  state.current += 1;
  render();
});

loadQuestions().catch((error) => {
  els.questionText.textContent = error.message;
});
