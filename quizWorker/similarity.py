import sys
# from transformers import AutoTokenizer, AutoModel
from sentence_transformers import SentenceTransformer, util

def calculate_similarity(answer, correct_answer):
    # upskyy/bge-m3-korean 모델 로드
    model = SentenceTransformer('upskyy/bge-m3-korean')
    embeddings1 = model.encode(answer, convert_to_tensor=True)
    embeddings2 = model.encode(correct_answer, convert_to_tensor=True)
    cosine_scores = util.pytorch_cos_sim(embeddings1, embeddings2)
    return cosine_scores.item()

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: similarity.py <answer> <correct_answer>")
        sys.exit(1)
    
    answer = sys.argv[1]
    correct_answer = sys.argv[2]
    similarity = calculate_similarity(answer, correct_answer)
    if isinstance(similarity, float):
        print(similarity)
    else:
        print(0.0)  # 유사도를 계산할 수 없는 경우 0.0 반환