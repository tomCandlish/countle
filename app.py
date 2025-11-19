import os
from datetime import date
from flask import Flask, render_template, send_from_directory, jsonify
from flask_bootstrap import Bootstrap5
import random
import hashlib
import logic.number_generator

# Initialize Flask app
def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'your-secret-key-here'  # Replace with a secure key

    # Initialize extensions
    bootstrap = Bootstrap5(app)

    def generate_daily_puzzle(today):
        # Use date as seed for deterministic puzzle generation
        numbers, target = logic.number_generator.generate_daily_puzzle()
        return numbers, target

    @app.route('/')
    def index():
        today = date.today()
        numbers, target = generate_daily_puzzle(today)
        return render_template('index.html', numbers=numbers, target=target, date=today)

    
    @app.route('/src/daily_puzzle')
    def daily_puzzle():
        today = date.today()
        numbers, target = generate_daily_puzzle(today)
        return jsonify({'numbers': numbers, 'target': target})
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)




