import json
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

with open('recipes.json', encoding='utf-8') as f:
    RECIPES = json.load(f)

CATEGORIES = ["水果", "蔬菜", "豆魚蛋肉", "全谷雜糧", "奶類", "堅果油脂"]

@app.route('/')
def index():
    return render_template('index.html', recipes=RECIPES)

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    selected = data['selected']
    servings = data['servings']

    total = {cat: 0 for cat in CATEGORIES}
    total_cal = 0
    selected_recipes = []

    for idx in selected:
        r = RECIPES[idx]
        factor = servings
        ingredients_str = [
            f"{ing['amount']}{ing['unit']} {ing['name']}".strip()
            for ing in r["ingredients"] if ing["amount"] > 0
        ]
        selected_recipes.append({
            "name": r["name"],
            "calories": round(r["calories"] * factor, 1),
            "ingredients": ingredients_str
        })
        total_cal += r["calories"] * factor
        for cat in CATEGORIES:
            total[cat] += r["portions"][cat] * factor

    advice = []
    if total["豆魚蛋肉"] < 1: advice.append("蛋白質不足，建議加豆腐、蛋或瘦肉")
    if total["蔬菜"] < 2: advice.append("蔬菜量不足，多吃綠色蔬菜")
    if total["全谷雜糧"] < 1: advice.append("全穀類不足，可加糙米或燕麥")

    return jsonify({
        "calories": round(total_cal, 1),
        "portions": {k: f"{round(v, 2)} 份" for k, v in total.items()},
        "advice": advice,
        "recipes": selected_recipes
    })

if __name__ == '__main__':
    app.run(debug=True)