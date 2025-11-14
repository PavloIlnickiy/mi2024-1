# main.py

import os
import psycopg2
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template

# (1) Load environment variables from a .env file
load_dotenv()

# --- Flask App Initialization ---
# Explicitly defining template/static folders makes the app more robust.
app = Flask(__name__, template_folder='templates', static_folder='static')

# (2) Connect to PostgreSQL
def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    try:
        # Connect using individual parameters from .env
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT")
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"Could not connect to the database: {e}")
        raise

# (4) Serve the main HTML page
@app.route('/')
def index():
    """Serves the main HTML page from the 'templates' folder."""
    return render_template('index.html')

# --- API Routes ---

# (3a) GET /api/expenses: List all expenses
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    """Fetches all expenses from the database and returns them as JSON."""
    conn = get_db_connection()
    cur = conn.cursor()
    # Бекенд тепер повертає всі дані, відсортовані за ID за замовчуванням.
    # Усе динамічне сортування обробляється на фронтенді.
    cur.execute("SELECT expense_id, category, amount FROM expenses ORDER BY expense_id DESC;")
    
    rows = cur.fetchall()
    columns = [desc[0] for desc in cur.description]
    expenses = [dict(zip(columns, row)) for row in rows]
    
    cur.close()
    conn.close()
    
    return jsonify(expenses)

# (3b) POST /api/expenses: Add a new expense
@app.route('/api/expenses', methods=['POST'])
def add_expense():
    """Adds a new expense to the database based on the incoming JSON payload."""
    data = request.get_json()
    # Updated validation for the new required fields
    if not data or 'category' not in data or 'amount' not in data:
        return jsonify({'error': 'Missing required fields: category and amount'}), 400

    category = data['category']
    amount = data['amount']

    conn = get_db_connection()
    cur = conn.cursor()
    
    # Updated INSERT statement for the new schema
    cur.execute(
        "INSERT INTO expenses (category, amount) VALUES (%s, %s) RETURNING expense_id;",
        (category, amount)
    )
    
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'Expense added successfully', 'id': new_id}), 201

# (3c) DELETE /api/expenses/<int:expense_id>: Delete an expense
@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """Deletes an expense from the database by its ID."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Updated DELETE statement to use 'expense_id'
    cur.execute("DELETE FROM expenses WHERE expense_id = %s;", (expense_id,))
    
    deleted_rows = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    
    if deleted_rows == 0:
        return jsonify({'error': 'Expense not found'}), 404
        
    return jsonify({'message': 'Expense deleted successfully'})

# --- Main Execution ---
if __name__ == '__main__':
    app.run(debug=True)