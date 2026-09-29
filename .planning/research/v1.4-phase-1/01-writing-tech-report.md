# Writing Assistant Technologies Research Report

**Project:** ResumeAI Smart Writing Assistant (v1.4 Phase 1)  
**Date:** March 13, 2026  
**Author:** Research Team  
**Status:** Complete

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Landscape](#2-technology-landscape)
3. [Detailed Analysis](#3-detailed-analysis)
4. [Integration Complexity](#4-integration-complexity)
5. [Recommendation](#5-recommendation)
6. [Implementation Notes](#6-implementation-notes)

---

## 1. Executive Summary

### Key Recommendations

For the ResumeAI Smart Writing Assistant, we recommend a **hybrid approach** combining:

| Priority | Technology | Use Case | Rationale |
|----------|------------|----------|-----------|
| **Primary** | **LanguageTool (self-hosted)** | Grammar, spelling, style checking | Open-source, 30+ languages, GDPR-compliant, proven at scale |
| **Secondary** | **Hugging Face Transformers (T5/BART)** | Advanced grammar correction | State-of-the-art accuracy, customizable, free inference tier |
| **Tertiary** | **spaCy + textstat** | Style analysis, readability metrics | Fast, production-ready, comprehensive NLP toolkit |
| **Future** | **Azure Text Analytics / AWS Comprehend** | Tone detection, sentiment analysis | Enterprise-grade, pay-per-use, no infrastructure |

### Budget Estimate

| Option | Monthly Cost (10K requests/day) | Setup Time |
|--------|--------------------------------|------------|
| Self-hosted (LanguageTool + Transformers) | $50-100 (server costs) | 2-3 weeks |
| Commercial APIs (Grammarly-style) | $500-2000+ | 1-2 weeks |
| Hybrid (recommended) | $100-300 | 2-3 weeks |

### Critical Findings

1. **Grammarly does NOT offer a public API** - Only pre-built integrations with major platforms
2. **LanguageTool is the only production-ready open-source option** with 2000+ enterprise customers
3. **Transformer models (T5, BART, GECTOR)** provide superior accuracy but require GPU for real-time performance
4. **Self-hosting is viable** for ResumeAI's use case given GDPR requirements and cost considerations

---

## 2. Technology Landscape

### 2.1 Open-Source Libraries

| Library | License | Grammar | Style | Tone | Languages | Self-Host |
|---------|---------|---------|-------|------|-----------|-----------|
| **LanguageTool** | LGPL/GPL | ✅ | ✅ | ❌ | 30+ | ✅ |
| **spaCy** | MIT | ⚠️ (via rules) | ✅ | ⚠️ (via models) | 75+ | ✅ |
| **NLTK** | Apache 2.0 | ⚠️ (basic) | ⚠️ | ⚠️ | Multiple | ✅ |
| **TextBlob** | MIT | ⚠️ (spelling) | ⚠️ | ✅ (sentiment) | Multiple | ✅ |
| **GECToR** | Apache 2.0 | ✅ | ❌ | ❌ | English | ✅ |
| **textstat** | MIT | ❌ | ✅ (readability) | ❌ | 8+ | ✅ |

### 2.2 Commercial APIs

| Service | Grammar | Style | Tone | Pricing (per 1K requests) | API Available |
|---------|---------|-------|------|---------------------------|---------------|
| **Grammarly** | ✅ | ✅ | ✅ | ❌ No public API | ❌ |
| **LanguageTool Premium** | ✅ | ✅ | ⚠️ | €8-20/month (user-based) | ✅ |
| **ProWritingAid** | ✅ | ✅ | ⚠️ | Contact sales | ⚠️ Limited |
| **Ginger** | ✅ | ✅ | ❌ | Contact sales | ⚠️ Limited |
| **Writer.com** | ✅ | ✅ | ✅ | Enterprise pricing | ✅ |
| **Sapling AI** | ✅ | ✅ | ⚠️ | Free tier + paid | ✅ |
| **DeepL API** | ❌ (translation) | ❌ | ❌ | €4.99-69.99/month | ✅ |
| **IBM Watson Tone Analyzer** | ❌ | ❌ | ✅ | $0.003/request | ✅ |
| **Google Cloud NLP** | ⚠️ (syntax) | ⚠️ | ✅ (sentiment) | $1-2/1K units | ✅ |
| **Azure Text Analytics** | ⚠️ | ⚠️ | ✅ (sentiment) | $2/1K transactions | ✅ |
| **AWS Comprehend** | ⚠️ | ⚠️ | ✅ (sentiment) | $0.0001/unit | ✅ |

### 2.3 Transformer Models (Hugging Face)

| Model | Type | Size | Downloads | Accuracy (F0.5) | Speed |
|-------|------|------|-----------|-----------------|-------|
| **vennify/t5-base-grammar-correction** | T5 | 220M | 106K | High | Medium |
| **pszemraj/flan-t5-large-grammar-synthesis** | T5 | 770M | Popular | Very High | Medium |
| **GECToR (RoBERTa)** | Tagging | 125M | 955★ | 64.0 | Fast (10x seq2seq) |
| **facebook/bart-large** | BART | 406M | Popular | High | Medium |
| **distilbert-base** | BERT | 66M | Popular | Medium | Fast |

---

## 3. Detailed Analysis

### 3.1 LanguageTool (Primary Recommendation)

**Overview:**  
LanguageTool is an open-source grammar, style, and spell checker with 30+ languages and 2000+ enterprise customers including BMW Group, European Union, and JetBrains.

**Features:**
- Grammar checking (AI-based with in-depth analysis)
- Spell checker (typos, misspellings)
- Punctuation checker (commas, dashes, hyphens)
- Casing correction (names, months, places)
- Style checker (overused phrases, foreign terms, redundant words)
- Paraphrasing tool (Premium)

**Supported Languages:**
English (US, UK, CA, AU, NZ, ZA), German, Spanish, French, Portuguese (BR, PT), Dutch, Catalan, Polish, Russian, Italian, Ukrainian, and 20+ more.

**Pricing:**

| Tier | Features | Cost |
|------|----------|------|
| **Free** | Spelling, simple punctuation, basic style | €0 |
| **Premium** | All error detection, best suggestions, unlimited paraphrasing | €8-20/month |
| **Business** | Team accounts, GDPR-compliant, admin controls | Contact sales |
| **Self-hosted** | Full features, unlimited usage | Free (LGPL) |

**API Endpoints:**

```
POST https://api.languagetool.org/v2/check
Content-Type: application/x-www-form-urlencoded

text=Hello+world&language=en-US&enabledOnly=false
```

**Response Format:**
```json
{
  "matches": [
    {
      "message": "Possible spelling mistake",
      "shortMessage": "Spelling",
      "replacements": ["Hello"],
      "offset": 0,
      "length": 5,
      "rule": {
        "id": "MORFOLOGIK_RULE_EN_US",
        "description": "Spelling"
      }
    }
  ]
}
```

**Self-Hosting Requirements:**
- Java 17+ (for LanguageTool 6.6+)
- 500+ MiB download, 1.5+ GiB disk space
- 2-4 GB RAM recommended
- Docker images available (community-maintained)

**Docker Deployment:**
```bash
docker run -p 8081:8081 erikvl87/languagetool
```

**Pros:**
- ✅ Open-source with active development
- ✅ 30+ languages supported
- ✅ Self-hostable (GDPR-compliant)
- ✅ 2000+ enterprise customers
- ✅ Comprehensive rule-based + ML checking
- ✅ Well-documented API
- ✅ Python wrapper available (`language-tool-python`)

**Cons:**
- ❌ Java dependency for self-hosting
- ❌ Some advanced features require Premium
- ❌ Community Docker images (no official)
- ❌ Limited tone detection capabilities

---

### 3.2 Hugging Face Transformers (Secondary Recommendation)

**Overview:**  
Hugging Face provides state-of-the-art transformer models for grammar correction with a generous free inference tier.

**Key Models:**

#### T5-Based Models
```python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_name = "pszemraj/flan-t5-large-grammar-synthesis"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

def correct_grammar(text: str) -> str:
    input_text = f"grammar: {text}"
    inputs = tokenizer.encode(input_text, return_tensors="pt")
    outputs = model.generate(inputs, max_length=512)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)
```

#### GECToR (Fast Inference)
```python
# GECToR uses sequence tagging (10x faster than seq2seq)
# GitHub: https://github.com/grammarly/gector

# Installation
git clone https://github.com/grammarly/gector.git
cd gector
pip install -r requirements.txt

# Prediction
python predict.py --model_path models/bert_12_gector.th \
                  --vocab_path vocab.txt \
                  --input_file input.txt \
                  --output_file output.txt
```

**Hugging Face Inference API:**

| Tier | Requests/Month | Rate Limit | Cost |
|------|----------------|------------|------|
| **Free** | Generous | Standard | $0 |
| **PRO** | Additional credits | Higher | $9/month |
| **Team** | Enhanced | High | Contact sales |

**Python Integration:**
```python
from huggingface_hub import InferenceClient

client = InferenceClient(api_key="HF_TOKEN")

# Grammar correction
response = client.text2text_generation(
    "grammar: She go to school yesterday",
    model="pszemraj/flan-t5-large-grammar-synthesis"
)
```

**Pros:**
- ✅ State-of-the-art accuracy
- ✅ Free inference tier available
- ✅ 100+ models for grammar correction
- ✅ Python/JavaScript SDKs
- ✅ OpenAI-compatible API
- ✅ 16+ provider options (Groq, Together, etc.)

**Cons:**
- ❌ GPU required for self-hosting (real-time)
- ❌ Rate limits on free tier
- ❌ Model quality varies
- ❌ Requires ML expertise for fine-tuning

---

### 3.3 spaCy (Style Analysis)

**Overview:**  
spaCy is an industrial-strength NLP library with 75+ languages, 84 trained pipelines, and production-ready performance.

**Key Features for Style Analysis:**
- Part-of-speech tagging
- Dependency parsing
- Named entity recognition
- Sentence segmentation
- Lemmatization
- Text classification
- Rule-based matching (Matcher, DependencyMatcher, EntityRuler)

**Installation:**
```bash
pip install spacy
python -m spacy download en_core_web_trf  # Transformer model
```

**Style Analysis Example:**
```python
import spacy
from spacy.matcher import Matcher

nlp = spacy.load("en_core_web_trf")

# Detect passive voice
def detect_passive_voice(text: str) -> list:
    doc = nlp(text)
    passive = []
    for token in doc:
        if token.dep_ == "auxpass" and token.head.pos_ == "VERB":
            passive.append(token.head.sent.text)
    return passive

# Detect overused words
def find_overused_words(text: str, threshold: int = 3) -> dict:
    doc = nlp(text)
    word_freq = {}
    for token in doc:
        if token.pos_ in ["ADJ", "ADV"]:
            word_freq[token.lemma_] = word_freq.get(token.lemma_, 0) + 1
    return {k: v for k, v in word_freq.items() if v >= threshold}
```

**Rule-Based Matching:**
```python
from spacy.matcher import Matcher

matcher = Matcher(nlp.vocab)

# Pattern: "very" + adjective (style suggestion)
pattern = [{"LOWER": "very"}, {"POS": "ADJ"}]
matcher.add("INTENSIFIER", [pattern])

doc = nlp("This is very important")
matches = matcher(doc)
for match_id, start, end in matches:
    print(f"Suggestion: Consider removing 'very' before '{doc[start+1:end].text}'")
```

**Pros:**
- ✅ Blazing fast (Cython-optimized)
- ✅ Production-ready
- ✅ 75+ languages
- ✅ Comprehensive NLP toolkit
- ✅ Active development
- ✅ Easy extensibility

**Cons:**
- ❌ No built-in grammar checking
- ❌ Requires custom rules for style analysis
- ❌ Transformer models need GPU for speed

---

### 3.4 textstat (Readability Metrics)

**Overview:**  
textstat calculates readability scores and text statistics for style analysis.

**Installation:**
```bash
pip install textstat
```

**Usage:**
```python
import textstat

text = "Your resume text here..."

# Readability scores
flesch_score = textstat.flesch_reading_ease(text)  # 0-100 (higher = easier)
grade_level = textstat.flesch_kincaid_grade(text)  # US grade level
gunning_fog = textstat.gunning_fog(text)  # Grade level
smog_index = textstat.smog_index(text)  # Years of education
ari = textstat.automated_readability_index(text)  # Grade level

# Text standard (consensus)
standard = textstat.text_standard(text)  # e.g., "9th-10th grade"

# Text metrics
syllables = textstat.syllable_count(text)
words = textstat.lexicon_count(text)
sentences = textstat.sentence_count(text)
difficult_words = textstat.difficult_words(text)
reading_time = textstat.reading_time(text)  # Minutes
```

**Interpretation:**

| Flesch Score | Readability | Grade Level |
|--------------|-------------|-------------|
| 90-100 | Very Easy | 5th grade |
| 80-89 | Easy | 6th grade |
| 70-79 | Fairly Easy | 7th grade |
| 60-69 | Standard | 8th-9th grade |
| 50-59 | Fairly Difficult | 10th-12th grade |
| 30-49 | Difficult | College |
| 0-29 | Very Confusing | College+ |

**Pros:**
- ✅ 20+ readability formulas
- ✅ Multi-language support
- ✅ Simple API
- ✅ MIT license
- ✅ Actively maintained

**Cons:**
- ❌ English-optimized (other languages limited)
- ❌ No grammar checking
- ❌ Basic style metrics only

---

### 3.5 Commercial APIs

#### IBM Watson Tone Analyzer

**Features:**
- Emotion analysis (anger, disgust, fear, joy, sadness)
- Sentiment analysis (positive, negative, neutral)
- Tone detection (analytical, confident, tentative)
- Language tone (openness, conscientiousness, extraversion, agreeableness, emotional range)

**Pricing:**
- Lite: Free (1K NLU items/month)
- Standard: $0.003 per NLU item
- Plus: Custom pricing

**Python SDK:**
```python
from ibm_watson import ToneAnalyzerV3
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator

authenticator = IAMAuthenticator('YOUR_API_KEY')
tone_analyzer = ToneAnalyzerV3(
    version='2017-09-21',
    authenticator=authenticator
)
tone_analyzer.set_service_url('YOUR_SERVICE_URL')

response = tone_analyzer.tone(
    text='Your resume text here',
    content_type='text/plain'
).get_result()

print(response)
```

#### Google Cloud Natural Language API

**Features:**
- Entity analysis
- Sentiment analysis
- Content classification
- Syntax analysis

**Pricing:**
- Free tier: 5K units/month
- Standard: $1-2 per 1K units

**Python Client:**
```python
from google.cloud import language_v2

client = language_v2.LanguageServiceClient()
document = language_v2.Document(
    content="Your text here",
    type_=language_v2.Document.Type.PLAIN_TEXT
)

# Sentiment analysis
sentiment = client.analyze_sentiment(request={"document": document}).document_sentiment
print(f"Score: {sentiment.score}, Magnitude: {sentiment.magnitude}")

# Entity analysis
entities = client.analyze_entities(request={"document": document}).entities
```

#### Azure Text Analytics

**Features:**
- Sentiment analysis
- Key phrase extraction
- Language detection
- Named entity recognition
- PII detection

**Pricing:**
- Free tier: 5K transactions/month
- Standard: $2 per 1K transactions

**Python SDK:**
```python
from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential

client = TextAnalyticsClient(
    endpoint="YOUR_ENDPOINT",
    credential=AzureKeyCredential("YOUR_KEY")
)

response = client.analyze_sentiment(documents=["Your text here"])
for result in response:
    print(f"Sentiment: {result.sentiment}, Score: {result.confidence_scores}")
```

#### AWS Comprehend

**Features:**
- Sentiment detection
- Entity recognition
- Key phrase extraction
- Syntax analysis
- PII detection
- Topic modeling

**Pricing:**
- First 50K units/month: Free
- Next 450K units: $0.0001 per unit

**Python SDK (boto3):**
```python
import boto3

comprehend = boto3.client('comprehend', region_name='us-east-1')

# Sentiment
response = comprehend.detect_sentiment(
    Text="Your text here",
    LanguageCode='en'
)
print(response['Sentiment'])

# Entities
response = comprehend.detect_entities(
    Text="Your text here",
    LanguageCode='en'
)
for entity in response['Entities']:
    print(f"{entity['Text']}: {entity['Type']}")
```

---

### 3.6 Grammarly, ProWritingAid, Ginger

#### Grammarly
**Status: NO PUBLIC API**

Grammarly does NOT offer a developer API or SDK. They only provide:
- Pre-built integrations (Google Docs, Word, Slack, etc.)
- Browser extensions
- Desktop apps
- Business/Enterprise plans (contact sales for custom integrations)

**Pricing (Business):**
- Pro: Individual tier
- Teams: Contact sales
- Enterprise: Contact sales (includes unlimited AI prompts, SAML SSO, admin controls)

#### ProWritingAid
**Status: LIMITED API**

ProWritingAid focuses on end-user applications rather than developer APIs. Available integrations:
- Google Docs
- Microsoft Word
- Scrivener
- Desktop editor

API access requires contacting sales. No public documentation available.

#### Ginger
**Status: LIMITED API**

Ginger offers a "Grammar API" but with limited public documentation:
- No pricing information available
- No rate limits published
- Requires contacting sales for access

---

## 4. Integration Complexity

### 4.1 LanguageTool Integration (FastAPI)

**Effort Estimate: 3-5 days**

**Backend Setup:**
```python
# resume-api/lib/writing_assistant.py
import language_tool_python
from typing import List, Dict, Optional
from pydantic import BaseModel

class GrammarMatch(BaseModel):
    message: str
    short_message: str
    replacements: List[str]
    offset: int
    length: int
    rule_id: str
    rule_description: str
    category: str

class GrammarCheckResponse(BaseModel):
    original_text: str
    corrected_text: str
    matches: List[GrammarMatch]
    language: str

class WritingAssistant:
    def __init__(self, language: str = "en-US", use_local: bool = True):
        if use_local:
            # Self-hosted LanguageTool
            self.tool = language_tool_python.LanguageTool(language)
        else:
            # Remote API
            self.tool = language_tool_python.LanguageTool(
                language,
                remote_server="https://api.languagetool.org/v2"
            )
    
    def check_grammar(self, text: str) -> GrammarCheckResponse:
        matches = self.tool.check(text)
        
        return GrammarCheckResponse(
            original_text=text,
            corrected_text=self.tool.correct(text),
            matches=[
                GrammarMatch(
                    message=m.message,
                    short_message=m.shortMessage,
                    replacements=m.replacements,
                    offset=m.offset,
                    length=m.errorLength,
                    rule_id=m.rule.id,
                    rule_description=m.rule.description,
                    category=m.rule.category.name if m.rule.category else "Other"
                )
                for m in matches
            ],
            language=language
        )
    
    def get_suggestions(self, text: str) -> List[Dict]:
        """Get writing suggestions with explanations."""
        matches = self.tool.check(text)
        suggestions = []
        
        for match in matches:
            suggestions.append({
                "type": self._categorize_match(match),
                "message": match.message,
                "suggestion": match.replacements[0] if match.replacements else None,
                "explanation": match.rule.description,
                "offset": match.offset,
                "length": match.errorLength
            })
        
        return suggestions
    
    def _categorize_match(self, match) -> str:
        """Categorize match into grammar, spelling, style, or punctuation."""
        category = match.rule.category.name if match.rule.category else "Other"
        
        if " spelling" in category.lower():
            return "spelling"
        elif " grammar" in category.lower():
            return "grammar"
        elif " style" in category.lower():
            return "style"
        elif " punctuation" in category.lower():
            return "punctuation"
        else:
            return "other"
    
    def close(self):
        """Close LanguageTool server."""
        self.tool.close()
```

**FastAPI Endpoint:**
```python
# resume-api/routes/writing.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from lib.writing_assistant import WritingAssistant

router = APIRouter(prefix="/api/v1/writing", tags=["writing"])

# Singleton
writing_assistant: Optional[WritingAssistant] = None

@router.on_event("startup")
async def startup_event():
    global writing_assistant
    writing_assistant = WritingAssistant(language="en-US", use_local=True)

@router.on_event("shutdown")
async def shutdown_event():
    if writing_assistant:
        writing_assistant.close()

class CheckRequest(BaseModel):
    text: str
    language: Optional[str] = "en-US"

@router.post("/check", response_model=GrammarCheckResponse)
async def check_grammar(request: CheckRequest):
    """Check grammar and style of text."""
    if not writing_assistant:
        raise HTTPException(503, "Writing assistant not initialized")
    
    try:
        return writing_assistant.check_grammar(request.text)
    except Exception as e:
        raise HTTPException(500, f"Grammar check failed: {str(e)}")

@router.get("/suggestions")
async def get_suggestions(text: str, language: str = "en-US"):
    """Get writing suggestions for text."""
    if not writing_assistant:
        raise HTTPException(503, "Writing assistant not initialized")
    
    try:
        return {"suggestions": writing_assistant.get_suggestions(text)}
    except Exception as e:
        raise HTTPException(500, f"Suggestions failed: {str(e)}")
```

**Frontend Integration:**
```typescript
// src/hooks/useWritingAssistant.ts
import { useState, useCallback } from 'react';

interface GrammarMatch {
  message: string;
  shortMessage: string;
  replacements: string[];
  offset: number;
  length: number;
  ruleId: string;
  ruleDescription: string;
  category: string;
}

interface CheckResponse {
  originalText: string;
  correctedText: string;
  matches: GrammarMatch[];
  language: string;
}

export function useWritingAssistant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkGrammar = useCallback(async (text: string): Promise<CheckResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/writing/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'en-US' })
      });
      
      if (!response.ok) throw new Error('Grammar check failed');
      
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const applyCorrection = useCallback((text: string, match: GrammarMatch): string => {
    if (match.replacements.length === 0) return text;
    
    const before = text.substring(0, match.offset);
    const after = text.substring(match.offset + match.length);
    return before + match.replacements[0] + after;
  }, []);

  return { checkGrammar, applyCorrection, loading, error };
}
```

---

### 4.2 Hugging Face Transformers Integration

**Effort Estimate: 5-7 days**

**Backend Setup:**
```python
# resume-api/lib/grammar_transformer.py
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
from typing import List, Optional
import asyncio

class GrammarTransformer:
    def __init__(self, model_name: str = "pszemraj/flan-t5-large-grammar-synthesis"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device)
        self.model.eval()
    
    @torch.no_grad()
    def correct(self, text: str, max_length: int = 512) -> str:
        """Correct grammar in text."""
        input_text = f"grammar: {text}"
        inputs = self.tokenizer(
            input_text,
            return_tensors="pt",
            truncation=True,
            max_length=max_length
        ).to(self.device)
        
        outputs = self.model.generate(
            **inputs,
            max_length=max_length,
            num_beams=5,
            early_stopping=True
        )
        
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    @torch.no_grad()
    def correct_batch(self, texts: List[str], batch_size: int = 8) -> List[str]:
        """Correct grammar in multiple texts."""
        all_corrected = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            inputs = self.tokenizer(
                [f"grammar: {t}" for t in batch],
                return_tensors="pt",
                padding=True,
                truncation=True
            ).to(self.device)
            
            outputs = self.model.generate(**inputs, max_length=512)
            corrected = [self.tokenizer.decode(o, skip_special_tokens=True) for o in outputs]
            all_corrected.extend(corrected)
        
        return all_corrected
    
    async def correct_async(self, text: str) -> str:
        """Async grammar correction."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.correct, text)
```

**FastAPI Endpoint:**
```python
# resume-api/routes/grammar_ai.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.grammar_transformer import GrammarTransformer

router = APIRouter(prefix="/api/v1/grammar-ai", tags=["grammar-ai"])

# Singleton (lazy initialization)
grammar_model: Optional[GrammarTransformer] = None

def get_grammar_model() -> GrammarTransformer:
    global grammar_model
    if grammar_model is None:
        grammar_model = GrammarTransformer()
    return grammar_model

class CorrectionRequest(BaseModel):
    text: str
    max_length: int = 512

class CorrectionResponse(BaseModel):
    original: str
    corrected: str
    model: str

@router.post("/correct", response_model=CorrectionResponse)
async def correct_grammar(request: CorrectionRequest):
    """AI-powered grammar correction using transformers."""
    try:
        model = get_grammar_model()
        corrected = await model.correct_async(request.text)
        
        return CorrectionResponse(
            original=request.text,
            corrected=corrected,
            model="pszemraj/flan-t5-large-grammar-synthesis"
        )
    except Exception as e:
        raise HTTPException(500, f"Correction failed: {str(e)}")

@router.post("/correct/batch")
async def correct_grammar_batch(requests: List[CorrectionRequest]):
    """Batch grammar correction."""
    try:
        model = get_grammar_model()
        texts = [r.text for r in requests]
        corrected = model.correct_batch(texts)
        
        return [
            CorrectionResponse(
                original=req.text,
                corrected=corr,
                model="pszemraj/flan-t5-large-grammar-synthesis"
            )
            for req, corr in zip(requests, corrected)
        ]
    except Exception as e:
        raise HTTPException(500, f"Batch correction failed: {str(e)}")
```

---

### 4.3 spaCy + textstat Integration

**Effort Estimate: 2-3 days**

**Backend Setup:**
```python
# resume-api/lib/style_analyzer.py
import spacy
import textstat
from spacy.matcher import Matcher
from typing import Dict, List, Optional
from pydantic import BaseModel

class StyleMetrics(BaseModel):
    flesch_reading_ease: float
    grade_level: float
    gunning_fog: float
    smog_index: float
    automated_readability_index: float
    text_standard: str
    word_count: int
    sentence_count: int
    syllable_count: int
    difficult_words: int
    reading_time_minutes: float

class StyleSuggestion(BaseModel):
    type: str
    message: str
    suggestion: Optional[str]
    offset: int
    length: int

class StyleAnalysis(BaseModel):
    metrics: StyleMetrics
    suggestions: List[StyleSuggestion]
    passive_voice_count: int
    overused_words: Dict[str, int]

class StyleAnalyzer:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_trf")
        self._setup_matchers()
    
    def _setup_matchers(self):
        """Setup rule-based matchers for style issues."""
        self.matcher = Matcher(self.nlp.vocab)
        
        # Pattern: "very" + adjective
        self.matcher.add("INTENSIFIER", [
            [{"LOWER": "very"}, {"POS": "ADJ"}]
        ])
        
        # Pattern: "really" + adjective
        self.matcher.add("INTENSIFIER_REALLY", [
            [{"LOWER": "really"}, {"POS": "ADJ"}]
        ])
        
        # Pattern: passive voice (auxpass + verb)
        self.matcher.add("PASSIVE_VOICE", [
            [{"DEP": "auxpass"}, {"POS": "VERB"}]
        ])
    
    def analyze(self, text: str) -> StyleAnalysis:
        """Analyze text style and readability."""
        doc = self.nlp(text)
        
        # Calculate readability metrics
        metrics = StyleMetrics(
            flesch_reading_ease=textstat.flesch_reading_ease(text),
            grade_level=textstat.flesch_kincaid_grade(text),
            gunning_fog=textstat.gunning_fog(text),
            smog_index=textstat.smog_index(text),
            automated_readability_index=textstat.automated_readability_index(text),
            text_standard=textstat.text_standard(text),
            word_count=textstat.lexicon_count(text),
            sentence_count=textstat.sentence_count(text),
            syllable_count=textstat.syllable_count(text),
            difficult_words=textstat.difficult_words(text),
            reading_time_minutes=textstat.reading_time(text)
        )
        
        # Find style issues
        suggestions = []
        matches = self.matcher(doc)
        
        for match_id, start, end in matches:
            rule_name = self.nlp.vocab.strings[match_id]
            span = doc[start:end]
            
            if rule_name.startswith("INTENSIFIER"):
                suggestions.append(StyleSuggestion(
                    type="style",
                    message=f"Consider removing '{doc[start].text}' for stronger writing",
                    suggestion=doc[start+1:end].text,
                    offset=span.start_char,
                    length=len(span.text)
                ))
        
        # Count passive voice
        passive_count = sum(
            1 for token in doc
            if token.dep_ == "auxpass" and token.head.pos_ == "VERB"
        )
        
        # Find overused words
        word_freq = {}
        for token in doc:
            if token.pos_ in ["ADJ", "ADV"] and not token.is_stop:
                word_freq[token.lemma_] = word_freq.get(token.lemma_, 0) + 1
        overused = {k: v for k, v in word_freq.items() if v >= 3}
        
        return StyleAnalysis(
            metrics=metrics,
            suggestions=suggestions,
            passive_voice_count=passive_count,
            overused_words=overused
        )
```

---

### 4.4 Commercial API Integration

**Effort Estimate: 1-2 days per API**

**IBM Watson Tone Analyzer:**
```python
# resume-api/lib/tone_analyzer.py
from ibm_watson import ToneAnalyzerV3
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from typing import Dict, Optional

class ToneAnalyzer:
    def __init__(self, api_key: str, service_url: str):
        authenticator = IAMAuthenticator(api_key)
        self.client = ToneAnalyzerV3(
            version='2017-09-21',
            authenticator=authenticator
        )
        self.client.set_service_url(service_url)
    
    def analyze(self, text: str) -> Dict:
        """Analyze tone of text."""
        response = self.client.tone(
            text=text,
            content_type='text/plain'
        ).get_result()
        
        return {
            "emotions": response.get('emotion_tone', {}).get('emotions', []),
            "sentiment": response.get('sentiment_tone', {}).get('tone', []),
            "language": response.get('language_tone', {}).get('tones', [])
        }
```

---

## 5. Recommendation

### 5.1 Primary Recommendation: Hybrid Approach

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    ResumeAI Frontend                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ LanguageTool│  │  spaCy +    │  │  Hugging Face       │  │
│  │ (Grammar)   │  │  textstat   │  │  Transformers       │  │
│  │             │  │  (Style)    │  │  (Advanced)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌────────────┐ ┌────────────┐ ┌────────────────┐
       │   Docker   │ │   Local    │ │  HF Inference  │
       │ Container  │ │   Models   │ │    API         │
       └────────────┘ └────────────┘ └────────────────┘
```

**Component Selection:**

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Grammar Checking** | LanguageTool (self-hosted) | Open-source, 30+ languages, proven at scale, GDPR-compliant |
| **Style Analysis** | spaCy + textstat | Fast, production-ready, comprehensive metrics |
| **Advanced Correction** | Hugging Face T5 | State-of-the-art accuracy, free tier available |
| **Tone Detection** | Azure Text Analytics (future) | Pay-per-use, no infrastructure, enterprise-grade |

### 5.2 Why NOT Commercial-Only

| Factor | Self-Hosted | Commercial APIs |
|--------|-------------|-----------------|
| **Cost (10K/day)** | $50-100/month | $500-2000+/month |
| **Data Privacy** | Full control | Third-party access |
| **GDPR Compliance** | ✅ Yes | ⚠️ Varies |
| **Customization** | ✅ Full | ❌ Limited |
| **Rate Limits** | ✅ None | ⚠️ Yes |
| **Setup Time** | 2-3 weeks | 1-2 weeks |
| **Maintenance** | ⚠️ Required | ✅ Managed |

### 5.3 Why NOT Open-Source-Only

| Factor | Hybrid | Open-Source-Only |
|--------|--------|------------------|
| **Accuracy** | ✅ Best of both | ⚠️ Good |
| **Cost** | ✅ Balanced | ✅ Lowest |
| **Maintenance** | ✅ Balanced | ⚠️ High |
| **Features** | ✅ Complete | ⚠️ Limited |
| **Tone Detection** | ✅ Available | ❌ Limited options |

### 5.4 Cost Comparison

**Scenario: 10,000 requests/day (300K/month)**

| Option | Monthly Cost | Annual Cost |
|--------|--------------|-------------|
| **LanguageTool Self-Hosted** | $50-100 (server) | $600-1200 |
| **LanguageTool Premium API** | €20/user × 10 = €200 | €2400 |
| **Hugging Face Inference** | Free-$50 | $0-600 |
| **spaCy + textstat** | Free | Free |
| **Azure Text Analytics** | $600 (300K × $2/1K) | $7200 |
| **Google Cloud NLP** | $300-600 | $3600-7200 |
| **Grammarly Business** | ❌ No API | N/A |
| **Writer.com** | Contact sales | Enterprise |

**Recommended Hybrid: $100-300/month**

---

## 6. Implementation Notes

### 6.1 Phase 1: Core Grammar Checking (Week 1-2)

**Tasks:**
1. Set up LanguageTool Docker container
2. Implement `WritingAssistant` class
3. Create FastAPI endpoints
4. Add frontend integration hook
5. Write unit tests

**Files to Create:**
```
resume-api/
├── lib/
│   └── writing_assistant.py      # LanguageTool wrapper
├── routes/
│   └── writing.py                # FastAPI endpoints
└── tests/
    └── test_writing_assistant.py # Tests

src/
├── hooks/
│   └── useWritingAssistant.ts    # React hook
└── components/
    └── WritingSuggestions.tsx    # UI component
```

**Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  languagetool:
    image: erikvl87/languagetool:latest
    ports:
      - "8081:8081"
    environment:
      - LANGUAGETOOL_PORT=8081
      - LANGUAGETOOL_LANGUAGE_MODEL=en-US
    memory: 4g
    restart: unless-stopped

  backend:
    build: ./resume-api
    ports:
      - "8000:8000"
    environment:
      - LANGUAGETOOL_URL=http://languagetool:8081
    depends_on:
      - languagetool
```

### 6.2 Phase 2: Style Analysis (Week 3)

**Tasks:**
1. Install spaCy and textstat
2. Implement `StyleAnalyzer` class
3. Create style analysis endpoints
4. Add readability dashboard
5. Write tests

**Files to Create:**
```
resume-api/
├── lib/
│   └── style_analyzer.py         # spaCy + textstat wrapper
├── routes/
│   └── style.py                  # Style endpoints
└── tests/
    └── test_style_analyzer.py    # Tests
```

### 6.3 Phase 3: Advanced AI Correction (Week 4-5)

**Tasks:**
1. Set up Hugging Face inference
2. Implement `GrammarTransformer` class
3. Create AI correction endpoints
4. Add comparison UI (before/after)
5. Performance optimization

**Files to Create:**
```
resume-api/
├── lib/
│   └── grammar_transformer.py    # Transformer wrapper
├── routes/
│   └── grammar_ai.py             # AI endpoints
└── tests/
    └── test_grammar_transformer.py
```

### 6.4 Phase 4: Tone Detection (Week 6 - Optional)

**Tasks:**
1. Set up Azure Text Analytics
2. Implement `ToneAnalyzer` class
3. Create tone analysis endpoints
4. Add tone visualization
5. Write tests

### 6.5 Testing Strategy

**Unit Tests:**
```python
# tests/test_writing_assistant.py
import pytest
from lib.writing_assistant import WritingAssistant

@pytest.fixture
def assistant():
    return WritingAssistant(language="en-US", use_local=True)

def test_grammar_check(assistant):
    result = assistant.check_grammar("She go to school")
    assert len(result.matches) > 0
    assert any("go" in m.message.lower() for m in result.matches)

def test_correction(assistant):
    corrected = assistant.tool.correct("She go to school")
    assert "goes" in corrected or "went" in corrected

def test_style_suggestions(assistant):
    suggestions = assistant.get_suggestions("This is very very good")
    assert any(s["type"] == "style" for s in suggestions)
```

**Integration Tests:**
```python
# tests/integration/test_writing_api.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_check_grammar_endpoint():
    response = client.post("/api/v1/writing/check", json={
        "text": "She go to school yesterday"
    })
    assert response.status_code == 200
    data = response.json()
    assert "matches" in data
    assert len(data["matches"]) > 0

def test_style_analysis_endpoint():
    response = client.get("/api/v1/style/analyze", params={
        "text": "This is a very well written sentence."
    })
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "flesch_reading_ease" in data["metrics"]
```

**E2E Tests:**
```typescript
// e2e/writing-assistant.spec.ts
import { test, expect } from '@playwright/test';

test('writing assistant shows grammar suggestions', async ({ page }) => {
  await page.goto('/editor');
  
  // Type text with grammar error
  await page.locator('textarea').fill('She go to school yesterday');
  
  // Click check button
  await page.click('[data-testid="check-grammar"]');
  
  // Wait for suggestions
  await expect(page.locator('[data-testid="suggestion"]')).toBeVisible();
  
  // Apply first suggestion
  await page.click('[data-testid="apply-correction"]');
  
  // Verify correction
  const text = await page.locator('textarea').inputValue();
  expect(text).toContain('goes');
});
```

### 6.6 Performance Considerations

**LanguageTool Optimization:**
```python
# Use connection pooling
from language_tool_python import LanguageTool

tool = LanguageTool(
    'en-US',
    motherTongue='en',
    disabled_rules=['WHITESPACE_RULE'],
    enabled_only=False,
    remote_server='http://localhost:8081',
    request_timeout=30
)

# Batch processing
def check_batch(texts: List[str]) -> List:
    return [tool.check(text) for text in texts]
```

**Transformer Optimization:**
```python
# Use GPU with mixed precision
from transformers import AutoModelForSeq2SeqLM
import torch

model = AutoModelForSeq2SeqLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16  # Mixed precision
).to('cuda')

# Batch generation
outputs = model.generate(
    **inputs,
    max_length=512,
    num_beams=4,
    early_stopping=True,
    num_return_sequences=1,
    batch_size=8
)
```

**Caching:**
```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=1000)
def cached_grammar_check(text_hash: str, text: str) -> dict:
    return writing_assistant.check_grammar(text)

def get_text_hash(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()
```

### 6.7 Security Considerations

**Input Validation:**
```python
from pydantic import BaseModel, Field, validator

class CheckRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    language: str = Field(default="en-US")
    
    @validator('text')
    def validate_text(cls, v):
        # Sanitize input
        v = v.strip()
        if len(v) > 50000:
            raise ValueError('Text too long (max 50000 chars)')
        return v
```

**Rate Limiting:**
```python
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

@router.post("/check", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def check_grammar(request: CheckRequest):
    ...
```

**Data Privacy:**
```python
# Don't log user text
import logging
logger = logging.getLogger(__name__)

@router.post("/check")
async def check_grammar(request: CheckRequest):
    logger.info(f"Grammar check request received (length: {len(request.text)})")
    # Don't log the actual text!
    ...
```

### 6.8 Monitoring & Observability

**Metrics to Track:**
- Request latency (p50, p95, p99)
- Error rate
- Grammar matches per request
- Correction acceptance rate
- Language distribution

**Example with Prometheus:**
```python
from prometheus_fastapi_instrumentator import Instrumentator

instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app)
```

---

## Appendix A: Quick Reference

### API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/writing/check` | POST | Check grammar and style |
| `/api/v1/writing/suggestions` | GET | Get writing suggestions |
| `/api/v1/style/analyze` | GET | Analyze text style |
| `/api/v1/style/readability` | GET | Get readability metrics |
| `/api/v1/grammar-ai/correct` | POST | AI-powered correction |
| `/api/v1/grammar-ai/correct/batch` | POST | Batch AI correction |

### Environment Variables

```bash
# .env
LANGUAGETOOL_URL=http://localhost:8081
LANGUAGETOOL_LANGUAGE=en-US

# Hugging Face (optional)
HF_TOKEN=your_token_here

# Azure (optional, Phase 4)
AZURE_TONE_ANALYZER_KEY=your_key
AZURE_TONE_ANALYZER_URL=your_url
```

### Dependencies

**Backend (requirements.txt):**
```
language-tool-python>=3.3.0
spacy>=3.7.0
textstat>=0.7.13
transformers>=4.38.0
torch>=2.0.0
fastapi>=0.110.0
pydantic>=2.0.0
```

**Frontend (package.json):**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

---

## Appendix B: Resources

### Documentation Links

- **LanguageTool:** https://languagetool.org/http-api
- **LanguageTool Python:** https://language-tool-python.readthedocs.io
- **spaCy:** https://spacy.io
- **textstat:** https://pypi.org/project/textstat
- **Hugging Face:** https://huggingface.co/docs
- **GECToR:** https://github.com/grammarly/gector

### Datasets for Fine-Tuning

- **JFLEG:** Journal of English as a Foreign Language Learner
- **CoNLL-2014:** Standard benchmark dataset
- **Lang-8:** Large-scale learner corpus
- **BEA-2019:** Write & Improve dataset

### Evaluation Metrics

- **F₀.₅ Score:** Precision-weighted F1 (standard for GEC)
- **BLEU:** Translation quality metric
- **GLEU:** Grammar-aware BLEU
- **M² Scorer:** GEC-specific metric

---

**Report Version:** 1.0  
**Last Updated:** March 13, 2026  
**Next Review:** After Phase 1 implementation
