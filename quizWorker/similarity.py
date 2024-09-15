import sys
from sentence_transformers import SentenceTransformer, util

# 모델을 한 번만 로드하여 계속 사용
model = SentenceTransformer('upskyy/bge-m3-korean')

def calculate_similarity(answer, correct_answer):
    embeddings1 = model.encode(answer, convert_to_tensor=True)
    embeddings2 = model.encode(correct_answer, convert_to_tensor=True)
    cosine_scores = util.pytorch_cos_sim(embeddings1, embeddings2)
    return cosine_scores.item()

# 지속적으로 입력을 받는 루프
while True:
    line = sys.stdin.readline().strip()  # Node.js에서 데이터를 받음
    if not line:
        continue

    try:
        # Node.js에서 전송한 데이터를 파싱
        answer, correct_answer = line.split('|')
        similarity = calculate_similarity(answer, correct_answer)
        print(similarity, flush=True)  # 유사도 결과를 Node.js로 출력
    except Exception as e:
        print(0.0, flush=True)  # 에러 발생 시 기본값 반환
