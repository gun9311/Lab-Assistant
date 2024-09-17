from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer, util

app = Flask(__name__)
model = SentenceTransformer('upskyy/bge-m3-korean')

@app.route('/similarity', methods=['POST'])
def calculate_similarity():
    data = request.get_json()  # JSON 데이터 받기
    answer = data.get('answer')
    correct_answer = data.get('correct_answer')

    if not answer or not correct_answer:
        return jsonify({'error': 'Invalid input'}), 400

    # 유사도 계산
    embeddings1 = model.encode(answer, convert_to_tensor=True)
    embeddings2 = model.encode(correct_answer, convert_to_tensor=True)
    cosine_scores = util.pytorch_cos_sim(embeddings1, embeddings2)

    # 결과 반환
    return jsonify({'similarity': cosine_scores.item()}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7000)  # 7000번 포트에서 실행
