# app2.py - MVP 3.0 升級版
# 特色：
# 1. 永遠顯示「一人份」營養（不管輸入幾人份）
# 2. 六大類中英對照（未來可對接 Foodball / USDA）
# 3. 食材清單按「實際份量」顯示（適合團膳採購）

import json
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# 讀取食譜
with open('recipes.json', encoding='utf-8') as f:
    RECIPES = json.load(f)

# 中英對照表（關鍵！未來可擴充）
CATEGORIES = {
    "水果": "Fruit",
    "蔬菜": "Vegetable",
    "豆魚蛋肉": "Legumes/Fish/Egg/Meat",
    "全谷雜糧": "Whole Grains",
    "奶類": "Dairy",
    "堅果油脂": "Nuts/Oils"
}

@app.route('/')
def index():
    return render_template('index.html', recipes=RECIPES)

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    selected = data['selected']
    servings = float(data['servings'])  # 總人數

    total_per_person = {cat: 0 for cat in CATEGORIES}
    total_cal_per_person = 0
    selected_recipes = []

    for idx in selected:
        r = RECIPES[idx]
        # 一人份數據
        cal_per_person = r["calories"]
        total_cal_per_person += cal_per_person

        recipe_ingredients = []
        for ing in r["ingredients"]:
            if ing["amount"] == 0:
                continue
            scaled_amount = round(ing["amount"] * servings, 2) if ing["amount"] > 0 else 0
            unit = ing["unit"] if ing["amount"] > 0 else ""
            recipe_ingredients.append(f"{scaled_amount}{unit} {ing['name']}".strip())

        selected_recipes.append({
            "name": r["name"],
            "calories_one": cal_per_person,        # 一人份熱量
            "calories_total": round(cal_per_person * servings, 1),  # 總熱量
            "ingredients": recipe_ingredients
        })

        # 累加一人份的六大類
        for cat in CATEGORIES:
            total_per_person[cat] += r["portions"][cat]

    # 飲食建議（基於一人份）
    advice = []
    if total_per_person["豆魚蛋肉"] < 1: advice.append("蛋白質不足，建議加豆腐、蛋或瘦肉")
    if total_per_person["蔬菜"] < 2: advice.append("蔬菜量不足，多吃綠色蔬菜")
    if total_per_person["全谷雜糧"] < 1: advice.append("全穀類不足，可加糙米或燕麥")

    return jsonify({
        "servings": servings,
        "calories_total": round(total_cal_per_person * servings, 1),
        "calories_per_person": round(total_cal_per_person, 1),
        "portions": { 
            f"{ch} {en}": f"{round(v, 2)} 份" 
            for ch, en in CATEGORIES.items() 
            for v in [total_per_person[ch]]
        },
        "advice": advice,
        "recipes": selected_recipes
    })

if __name__ == '__main__':
    app.run(debug=True)