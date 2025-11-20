const axios = require('axios');

// دالة لتوليد embedding من نص باستخدام DeepSeek
async function generateEmbedding(text) {
  try {
    if (!text || text.trim() === '') {
      return null;
    }

    // تنظيف النص
    const cleanText = text.trim().substring(0, 2000); // حد أقصى 2000 حرف

    const response = await axios.post(
      'https://api.deepseek.com/v1/embeddings',
      {
        model: 'deepseek-chat',
        input: cleanText
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || 'sk-73b3ec9150bc4d79952843a0ce884373'}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    if (response.data && response.data.data && response.data.data[0]) {
      return response.data.data[0].embedding;
    }

    return null;
  } catch (error) {
    console.error('Embedding Generation Error:', error.message);
    return null;
  }
}

// دالة لحساب التشابه بين vectors (cosine similarity)
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// دالة لترتيب النتائج حسب التشابه
function rankBySemanticSimilarity(items, queryEmbedding, textField = 'text') {
  if (!queryEmbedding || !Array.isArray(items) || items.length === 0) {
    return items;
  }

  const rankedItems = items
    .map(item => {
      if (!item.embedding || !Array.isArray(item.embedding)) {
        return {
          ...item,
          semanticScore: 0
        };
      }

      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      
      return {
        ...item,
        semanticScore: similarity
      };
    })
    .sort((a, b) => b.semanticScore - a.semanticScore);

  return rankedItems;
}

module.exports = {
  generateEmbedding,
  cosineSimilarity,
  rankBySemanticSimilarity
};
