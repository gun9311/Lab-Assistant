import sys
from sentence_transformers import SentenceTransformer, util

# 모델 로드 (스크립트 호출 시마다 반복적으로 로드됨)
def load_model():
    try:
        model = SentenceTransformer('upskyy/bge-m3-korean')
        return model
    except Exception as e:
        print(f"Error loading model: {str(e)}", file=sys.stderr)
        sys.exit(1)

def calculate_similarity(model, answer, correct_answer):
    try:
        embeddings1 = model.encode(answer, convert_to_tensor=True)
        embeddings2 = model.encode(correct_answer, convert_to_tensor=True)
        cosine_scores = util.pytorch_cos_sim(embeddings1, embeddings2)
        return cosine_scores.item()
    except Exception as e:
        print(f"Error calculating similarity: {str(e)}", file=sys.stderr)
        return 0.0  # 유사도를 계산할 수 없는 경우 0.0 반환

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: similarity.py <answer> <correct_answer>", file=sys.stderr)
        sys.exit(1)
    
    answer = sys.argv[1]
    correct_answer = sys.argv[2]

    # 모델 로드
    model = load_model()

    # 유사도 계산
    similarity = calculate_similarity(model, answer, correct_answer)
    
    if isinstance(similarity, float):
        print(similarity)
    else:
        print(0.0)
