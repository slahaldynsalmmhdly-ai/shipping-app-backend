#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from sentence_transformers import SentenceTransformer, util
import json
import sys

# تحميل النموذج (يدعم العربية)
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

def analyze_search_query(query):
    """
    تحليل استعلام البحث باستخدام AI لاستخراج:
    - النص الأساسي للبحث
    - المدينة (إن وجدت)
    - الدولة (إن وجدت)
    - الفلتر الزمني (إن وجد)
    - نوع المحتوى (وظائف، شركات، إلخ)
    """
    
    query_lower = query.lower().strip()
    
    # قوائم الكلمات المفتاحية
    cities = [
        'الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'الطائف', 'تبوك', 'أبها', 'حائل',
        'القاهرة', 'الإسكندرية', 'الجيزة', 'بورسعيد', 'السويس', 'الأقصر', 'أسوان',
        'دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'الفجيرة',
        'الكويت', 'حولي', 'الفروانية', 'الأحمدي', 'الجهراء',
        'عمان', 'إربد', 'الزرقاء', 'العقبة', 'السلط', 'مادبا', 'الكرك'
    ]
    
    countries = [
        'السعودية', 'مصر', 'الإمارات', 'الكويت', 'الأردن', 'قطر', 'البحرين', 'عمان',
        'لبنان', 'سوريا', 'العراق', 'اليمن', 'ليبيا', 'تونس', 'الجزائر', 'المغرب'
    ]
    
    time_keywords = {
        'حديثة': 7,
        'حديث': 7,
        'جديدة': 7,
        'جديد': 7,
        'اليوم': 1,
        'أمس': 2,
        'الأسبوع': 7,
        'الشهر': 30,
        'قريبا': 7,
        'قريب': 7,
        'مؤخرا': 7,
        'مؤخر': 7,
        'الآن': 1
    }
    
    job_keywords = [
        'وظيفة', 'وظائف', 'عمل', 'توظيف', 'مطلوب', 'طلب عمل', 'اعلان وظيفة',
        'كهربائي', 'سائق', 'مهندس', 'محاسب', 'معلم', 'طبيب', 'ممرض', 'فني'
    ]
    
    # استخراج المعلومات
    result = {
        'searchText': query,
        'city': None,
        'country': None,
        'timeFilter': None,
        'isJobSearch': False,
        'cleanedText': query
    }
    
    # البحث عن المدينة
    for city in cities:
        if city in query_lower:
            result['city'] = city
            result['cleanedText'] = result['cleanedText'].replace(city, '').strip()
            break
    
    # البحث عن الدولة
    for country in countries:
        if country in query_lower:
            result['country'] = country
            result['cleanedText'] = result['cleanedText'].replace(country, '').strip()
            break
    
    # البحث عن الفلتر الزمني
    for keyword, days in time_keywords.items():
        if keyword in query_lower:
            result['timeFilter'] = days
            result['cleanedText'] = result['cleanedText'].replace(keyword, '').strip()
            break
    
    # البحث عن الوظائف
    for keyword in job_keywords:
        if keyword in query_lower:
            result['isJobSearch'] = True
            break
    
    # تنظيف النص النهائي
    result['cleanedText'] = ' '.join(result['cleanedText'].split())
    
    return result

def semantic_search(query, documents, top_k=10):
    """
    البحث الدلالي باستخدام embeddings
    """
    # تحويل الاستعلام والمستندات إلى embeddings
    query_embedding = model.encode(query, convert_to_tensor=True)
    doc_embeddings = model.encode(documents, convert_to_tensor=True)
    
    # حساب التشابه
    similarities = util.cos_sim(query_embedding, doc_embeddings)[0]
    
    # الحصول على أعلى النتائج
    top_results = similarities.topk(min(top_k, len(documents)))
    
    results = []
    for score, idx in zip(top_results.values, top_results.indices):
        results.append({
            'index': int(idx),
            'score': float(score),
            'text': documents[int(idx)]
        })
    
    return results

if __name__ == '__main__':
    # قراءة الاستعلام من command line
    if len(sys.argv) > 1:
        query = sys.argv[1]
        result = analyze_search_query(query)
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(json.dumps({'error': 'No query provided'}, ensure_ascii=False))
