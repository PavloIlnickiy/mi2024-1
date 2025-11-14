// Чекаємо, поки весь HTML-документ буде завантажено та розібрано браузером
document.addEventListener("DOMContentLoaded", () => {
  // --- СТАН ДОДАТКУ ---
  // Централізоване сховище для всіх даних про витрати, що виступає як кеш на стороні клієнта.
  let expenses = [];
  // Стан сортування: 'none', 'asc', 'desc'
  let sortState = { column: null, direction: "none" };

  // --- КЕШУВАННЯ DOM-ЕЛЕМЕНТІВ ---
  // Зберігаємо посилання на елементи, щоб не шукати їх у DOM щоразу.
  const form = document.getElementById("add-expense-form");
  const categoryInput = document.getElementById("category");
  const amountInput = document.getElementById("amount");
  const thCategory = document.getElementById("th-category");
  const thAmount = document.getElementById("th-amount");
  const tableBody = document.getElementById("expenses-table-body");
  const filterInput = document.getElementById("filter-category");
  const formError = document.getElementById("form-error");
  const listError = document.getElementById("list-error");

  // --- ФУНКЦІЇ ВЗАЄМОДІЇ З API ---

  /**
   * Завантажує всі витрати з бекенду, оновлює локальний стан та перемальовує список.
   */
  const fetchAndRenderExpenses = async () => {
    try {
      const response = await fetch("/api/expenses");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      expenses = data; // Оновлюємо локальний стан даними з сервера
      sortState = { column: null, direction: "none" }; // Скидаємо сортування при завантаженні нових даних
      updateSortIndicators();
      renderExpenses(); // Перемальовуємо таблицю з новими даними
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      showError(
        "list",
        "Could not load expenses from the server. Please try again later."
      );
    }
  };

  // --- ФУНКЦІЯ ВІДОБРАЖЕННЯ ---
  /**
   * Відображає поточний стан `expenses` у HTML-таблиці, застосовуючи фільтри.
   */
  const renderExpenses = () => {
    // Очищуємо таблицю та попередні помилки перед оновленням
    tableBody.innerHTML = "";
    clearError("list");

    if (expenses.length === 0) {
      showError(
        "list",
        "No expenses added yet. Please add one using the form above."
      );
      return;
    }

    let expensesToRender = [...expenses];

    // --- СОРТУВАННЯ ---
    if (sortState.direction !== "none") {
      expensesToRender.sort((a, b) => {
        // Отримуємо значення для порівняння. Для 'amount' перетворюємо в число.
        const valA =
          sortState.column === "amount"
            ? parseFloat(a[sortState.column])
            : a[sortState.column];
        const valB =
          sortState.column === "amount"
            ? parseFloat(b[sortState.column])
            : b[sortState.column];

        let comparison = 0;
        if (typeof valA === "string") {
          comparison = valA.localeCompare(valB, undefined, {
            sensitivity: "base",
          });
        } else {
          comparison = valA - valB;
        }

        // Якщо напрямок 'desc', інвертуємо результат порівняння
        return sortState.direction === "asc" ? comparison : -comparison;
      });
    }

    // --- ФІЛЬТРАЦІЯ ---
    const filterText = filterInput.value.toLowerCase();
    const filteredExpenses = expensesToRender.filter((expense) =>
      expense.category.toLowerCase().includes(filterText)
    );

    if (filteredExpenses.length === 0) {
      showError("list", "No expenses match the current filter.");
      return;
    }

    filteredExpenses.forEach((expense) => {
      const row = tableBody.insertRow();
      // Використовуємо ID з бази даних (`expense_id`) для атрибута dataset
      row.dataset.id = expense.expense_id;

      // Використовуємо шаблонні рядки для чистоти коду
      row.innerHTML = `
                <td>${escapeHTML(expense.category)}</td>
                <td>${parseFloat(expense.amount).toFixed(2)}</td>
                <td><button class="delete-btn">Delete</button></td>
            `;
    });
  };

  // --- ОБРОБНИКИ ПОДІЙ ---

  /**
   * Обробляє відправку форми для додавання нової витрати.
   */
  const handleAddExpense = async (e) => {
    e.preventDefault(); // Запобігаємо стандартній поведінці форми (перезавантаженню сторінки)

    const category = categoryInput.value.trim();
    const amount = amountInput.value.trim();

    if (!category || !amount) {
      showError("form", "Please fill in all fields.");
      return;
    }
    clearError("form");

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category, amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add expense.");
      }

      form.reset(); // Очищуємо поля форми
      categoryInput.focus(); // Повертаємо фокус на перше поле для зручності

      // Повторно завантажуємо всі витрати, щоб UI був синхронізований з сервером
      await fetchAndRenderExpenses();
    } catch (error) {
      console.error("Failed to add expense:", error);
      showError("form", error.message);
    }
  };

  /**
   * Обробляє видалення витрати (використовує делегування подій).
   */
  const handleDeleteExpense = async (e) => {
    // Перевіряємо, чи був клік саме на кнопці з класом 'delete-btn'
    if (e.target.classList.contains("delete-btn")) {
      const row = e.target.closest("tr");
      const expenseId = parseInt(row.dataset.id, 10);

      if (isNaN(expenseId)) return;

      try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete expense.");
        }

        // Повторно завантажуємо дані для оновлення списку — простий та надійний спосіб синхронізації
        await fetchAndRenderExpenses();
      } catch (error) {
        console.error("Failed to delete expense:", error);
        showError("list", error.message);
      }
    }
  };

  /**
   * Обробляє клік по заголовку таблиці для сортування.
   * @param {string} column - Назва стовпця ('category' або 'amount').
   */
  const handleSort = (column) => {
    if (sortState.column === column) {
      // Циклічна зміна напрямку: asc -> desc -> none
      if (sortState.direction === "asc") {
        sortState.direction = "desc";
      } else if (sortState.direction === "desc") {
        sortState.direction = "none";
        sortState.column = null;
      }
    } else {
      // Новий стовпець для сортування, починаємо з 'asc'
      sortState.column = column;
      sortState.direction = "asc";
    }

    updateSortIndicators();
    renderExpenses();
  };

  /**
   * Оновлює візуальні індикатори сортування в заголовках таблиці.
   */
  const updateSortIndicators = () => {
    const headers = [thCategory, thAmount];
    headers.forEach((th) => {
      th.classList.remove("sort-asc", "sort-desc");
      if (th.dataset.column === sortState.column) {
        // Додаємо клас, тільки якщо є активне сортування
        if (sortState.direction !== "none") {
          th.classList.add(`sort-${sortState.direction}`);
        }
      }
    });
  };

  // --- ДОПОМІЖНІ ФУНКЦІЇ ---
  const showError = (type, message) => {
    const errorElement = type === "form" ? formError : listError;
    errorElement.textContent = message;
  };
  const clearError = (type) => {
    const errorElement = type === "form" ? formError : listError;
    errorElement.textContent = "";
  };
  // Проста функція для екранування HTML для запобігання XSS-атак
  const escapeHTML = (str) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // --- РЕЄСТРАЦІЯ ОБРОБНИКІВ ПОДІЙ ---
  form.addEventListener("submit", handleAddExpense);
  tableBody.addEventListener("click", handleDeleteExpense); // Один слухач на всю таблицю!
  thCategory.addEventListener("click", () => handleSort("category"));
  thAmount.addEventListener("click", () => handleSort("amount"));
  filterInput.addEventListener("input", renderExpenses); // 'input' реагує на будь-які зміни в полі

  // --- ПОЧАТКОВЕ ВІДОБРАЖЕННЯ ---
  // Завантажуємо та відображаємо початковий список витрат при завантаженні сторінки.
  fetchAndRenderExpenses();
});
