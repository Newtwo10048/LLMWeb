import json
import csv
from flask import Flask, jsonify, request
from flask_cors import CORS
from pathlib import Path

app = Flask(__name__)
CORS(app)  # 允許前端跨域請求

# 讀取食譜
with open('recipes.json', encoding='utf-8') as f:
    RECIPES = json.load(f)

# 六大類翻譯
CATEGORY_MAP = {
    "蔬菜": "Vegetable", "青菜": "Vegetable", "菜": "Vegetable", "蔬": "Vegetable",
    "根莖類": "Vegetable", "葉菜類": "Vegetable", "蔬菜類": "Vegetable",
    "豆魚蛋肉": "Protein", "豆魚肉蛋": "Protein", "豆魚蛋肉類": "Protein",
    "肉蛋豆魚": "Protein", "蛋白質類": "Protein", "肉類": "Protein",
    "魚類": "Protein", "蛋類": "Protein", "豆類": "Protein", "豆製品": "Protein",
    "全穀雜糧": "Whole Grains", "全穀類": "Whole Grains", "全穀": "Whole Grains",
    "五穀雜糧": "Whole Grains", "雜糧類": "Whole Grains", "穀類": "Whole Grains",
    "水果": "Fruit", "水果類": "Fruit",
    "奶類": "Dairy", "乳品類": "Dairy", "乳類": "Dairy", "乳製品": "Dairy",
    "堅果油脂": "Nuts & Oils", "油脂類": "Nuts & Oils", "堅果種子類": "Nuts & Oils",
    "堅果類": "Nuts & Oils", "油脂": "Nuts & Oils",
}

def get_category_english(chinese_name: str) -> str | None:
    name = chinese_name.strip()
    if name in CATEGORY_MAP:
        return CATEGORY_MAP[name]
    for key, eng in CATEGORY_MAP.items():
        if key in name:
            return eng
    return None

# 食材翻譯
FOOD_DICT = {}
csv_path = Path(__file__).parent / "taiwan_food_500_en_full.csv"
try:
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            FOOD_DICT[row['中文食材'].strip()] = row['英文名稱'].strip()
except FileNotFoundError:
    print("警告：找不到 CSV，食材不會翻譯")

def translate_food(chinese: str) -> str:
    return FOOD_DICT.get(chinese.strip(), chinese)

# API：取得食譜列表
@app.route('/api/recipesMVP', methods=['GET'])
def get_recipes():
    return jsonify(RECIPES)

# API：計算營養
@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.json
    selected = data['selected']
    servings = float(data['servings'])

    total_per_person = {}
    total_cal_per_person = 0
    selected_recipes = []

    for idx in selected:
        r = RECIPES[idx]
        cal_per_person = r["calories"]
        total_cal_per_person += cal_per_person

        for cat_ch, value in r["portions"].items():
            cat_en = get_category_english(cat_ch)
            if cat_en:
                if cat_en not in total_per_person:
                    total_per_person[cat_en] = 0
                total_per_person[cat_en] += value

        recipe_ingredients = []
        for ing in r["ingredients"]:
            if ing["amount"] == 0:
                continue
            scaled_amount = round(ing["amount"] * servings, 2)
            ing_name_en = translate_food(ing["name"])
            recipe_ingredients.append(f"{scaled_amount}{ing['unit']} {ing_name_en}".strip())

        selected_recipes.append({
            "name": r["name"],
            "calories_one": cal_per_person,
            "calories_total": round(cal_per_person * servings, 1),
            "ingredients": recipe_ingredients
        })

    advice = []
    protein = total_per_person.get("Protein", 0)
    vegetable = total_per_person.get("Vegetable", 0)
    grains = total_per_person.get("Whole Grains", 0)
    if protein < 1: advice.append("蛋白質不足，建議加豆腐、蛋或瘦肉")
    if vegetable < 2: advice.append("蔬菜量不足，多吃綠色蔬菜")
    if grains < 1: advice.append("全穀類不足，可加糙米或燕麥")

    REVERSE_CATEGORY = {v: k for k, v in CATEGORY_MAP.items()}
    portions = {
        f"{en} ({REVERSE_CATEGORY.get(en, '未知')})": f"{round(v, 2)} 份"
        for en, v in total_per_person.items()
    }

    return jsonify({
        "servings": servings,
        "calories_total": round(total_cal_per_person * servings, 1),
        "calories_per_person": round(total_cal_per_person, 1),
        "portions": portions,
        "advice": advice,
        "recipes": selected_recipes
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)