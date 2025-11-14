# Трекер Витрат (Expense Tracker)

Простий веб-додаток для відстеження витрат, створений з використанням Flask для бекенду та PostgreSQL для бази даних. Додаток надає RESTful API для керування записами про витрати та простий односторінковий інтерфейс для взаємодії з ним.

## Функціонал

- Перегляд списку всіх витрат.
- Додавання нової витрати із зазначенням категорії та суми.
- Видалення витрати за її ідентифікатором (ID).
- Простий веб-інтерфейс для взаємодії з API.

## Технології

- **Бекенд:** Python 3, Flask
- **База даних:** PostgreSQL
- **Python бібліотеки:**
  - `psycopg2-binary`: Адаптер PostgreSQL для Python.
  - `python-dotenv`: Для завантаження змінних середовища з файлу `.env`.
  - `Flask`: Мікро-фреймворк для створення веб-додатків.

## Вимоги

Перед початком роботи переконайтеся, що у вас встановлено:

- Python 3.8+
- `pip` (менеджер пакетів Python)
- Встановлений та запущений сервер PostgreSQL

## Встановлення та налаштування

1.  **Клонуйте репозиторій (або просто розпакуйте архів):**
    ```bash
    git clone <URL-вашого-репозиторію>
    cd practice_sample
    ```

2.  **Створіть та активуйте віртуальне середовище:**
    ```bash
    # Для Windows
    python -m venv venv
    venv\Scripts\activate

    # Для macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Встановіть необхідні залежності:**
    (Спершу створіть файл `requirements.txt` з вмістом нижче, якщо його немає)
    ```bash
    pip install -r requirements.txt
    ```

    **`requirements.txt`:**
    ```
    Flask
    psycopg2-binary
    python-dotenv
    ```

4.  **Налаштуйте базу даних PostgreSQL:**
    - Створіть нову базу даних, наприклад, `expenses_db`.
    - Створіть користувача з паролем, який матиме доступ до цієї бази даних.

5.  **Створіть таблицю `expenses`:**
    Виконайте наступний SQL-запит у вашій базі даних:
    ```sql
    CREATE TABLE expenses (
        expense_id SERIAL PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ```

6.  **Налаштуйте змінні середовища:**
    Створіть файл `.env` в кореневій папці проекту (`practice_sample/`) та додайте до нього ваші дані для підключення до БД. Використовуйте `.env.example` як шаблон.

    **Приклад файлу `.env`:**
    ```
    DB_NAME=expenses_db
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_HOST=localhost
    DB_PORT=5432
    ```

## Запуск додатку

Після виконання всіх кроків налаштування, запустіть Flask-сервер:

```bash
python app/main.py
```

Додаток буде доступний за адресою `http://127.0.0.1:5000`.

## API Ендпоінти

### Отримати всі витрати

- **URL:** `/api/expenses`
- **Метод:** `GET`
- **Відповідь успіху:**
  - **Код:** 200 OK
  - **Вміст:** `[{"amount": "150.00", "category": "Їжа", "expense_id": 1}, ...]`

### Додати нову витрату

- **URL:** `/api/expenses`
- **Метод:** `POST`
- **Тіло запиту (JSON):**
  ```json
  {
      "category": "Транспорт",
      "amount": 50.75
  }
  ```
- **Відповідь успіху:**
  - **Код:** 201 Created
  - **Вміст:** `{"id": 2, "message": "Expense added successfully"}`

### Видалити витрату

- **URL:** `/api/expenses/<expense_id>`
- **Метод:** `DELETE`
- **Приклад URL:** `/api/expenses/2`
- **Відповідь успіху:**
  - **Код:** 200 OK
  - **Вміст:** `{"message": "Expense deleted successfully"}`
- **Відповідь помилки (якщо запис не знайдено):**
  - **Код:** 404 Not Found
  - **Вміст:** `{"error": "Expense not found"}`