# Backend of GenMentor

GenMentor is an AI-powered personalized learning platform that creates adaptive learning experiences tailored to individual learners' needs, skill gaps, and goals. The system combines advanced AI technologies including Large Language Models, Retrieval-Augmented Generation (RAG), and intelligent tutoring systems to deliver comprehensive educational content.

## Features

- **AI Chatbot Tutor**: Interactive conversational learning with personalized responses
- **Skill Gap Identification**: Analyzes learner profiles and identifies knowledge gaps
- **Learning Goal Refinement**: Helps learners define and refine their educational objectives
- **Adaptive Learner Modeling**: Creates and updates detailed learner profiles
- **Personalized Resource Delivery**: Generates tailored learning content and materials
- **Learning Path Scheduling**: Creates structured learning sequences with session planning
- **Knowledge Point Exploration**: Deep-dives into specific topics with multiple perspectives
- **Document Integration**: Combines various knowledge sources into cohesive learning materials
- **Quiz Generation**: Creates personalized assessments to test understanding

## Architecture

The system is built with a modular architecture consisting of:

- **Core Modules**:
  - `ai_chatbot_tutor`: Conversational AI tutoring interface
  - `skill_gap_identification`: Analyzes and identifies learning gaps
  - `adaptive_learner_modeling`: Manages learner profiles and adaptation
  - `personalized_resource_delivery`: Creates customized learning content
  - `learner_simulation`: Simulates learner behaviors for testing

- **Base Components**:
  - `llm_factory`: Manages different LLM providers (DeepSeek, OpenAI, etc.)
  - `rag_factory`: Handles retrieval-augmented generation
  - `embedder_factory`: Manages text embedding models
  - `searcher_factory`: Integrates web search capabilities

- **Configuration**: Hydra-based configuration management with YAML files

## Quickstart

### Prerequisites

- Python 3.12+
- Conda or virtual environment

### Installation

```bash
uv venv
source .venv/bin/activate  # on Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
```

### Running the Application

```bash
# Start the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Core Learning Endpoints

#### Chat with AI Tutor

```bash
curl -X POST "http://localhost:5000/chat-with-tutor" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": "[{\"role\": \"user\", \"content\": \"Hello!\"}]",
    "learner_profile": "Learner profile information",
    "model_provider": "deepseek",
    "model_name": "deepseek-chat"
  }'
```

#### Refine Learning Goal

```bash
curl -X POST "http://localhost:5000/refine-learning-goal" \
  -H "Content-Type: application/json" \
  -d '{
    "learning_goal": "Learn machine learning",
    "learner_information": "Beginner with programming experience",
    "model_provider": "deepseek",
    "model_name": "deepseek-chat"
  }'
```

#### Identify Skill Gap (with CV upload)

```bash
curl -X POST "http://localhost:5000/identify-skill-gap" \
  -F "goal=Learn data science" \
  -F "cv=@path/to/cv.pdf" \
  -F "model_provider=deepseek" \
  -F "model_name=deepseek-chat"
```

#### Create Learner Profile

```bash
curl -X POST "http://localhost:5000/create-learner-profile-with-info" \
  -H "Content-Type: application/json" \
  -d '{
    "learning_goal": "Learn web development",
    "learner_information": "{\"experience\": \"beginner\", \"interests\": [\"frontend\", \"backend\"]}",
    "skill_gaps": "{\"missing_skills\": [\"JavaScript\", \"CSS\"]}",
    "method_name": "genmentor",
    "model_provider": "deepseek",
    "model_name": "deepseek-chat"
  }'
```

#### Schedule Learning Path

```bash
curl -X POST "http://localhost:5000/schedule-learning-path" \
  -H "Content-Type: application/json" \
  -d '{
    "learner_profile": "{\"skills\": [], \"goals\": [\"web development\"]}",
    "session_count": 10,
    "model_provider": "deepseek",
    "model_name": "deepseek-chat"
  }'
```

#### Generate Tailored Content

```bash
curl -X POST "http://localhost:5000/tailor-knowledge-content" \
  -H "Content-Type: application/json" \
  -d '{
    "learner_profile": "{\"level\": \"beginner\"}",
    "learning_path": "[{\"topic\": \"HTML Basics\"}]",
    "learning_session": "{\"current_topic\": \"HTML\"}",
    "use_search": true,
    "allow_parallel": true,
    "with_quiz": true
  }'
```

#### Streaming Tutor Chat

`POST /chat-with-tutor/stream` — same payload as `/chat-with-tutor`; responds
with a plain-text token stream instead of JSON.

### State & Knowledge-Base Endpoints

The backend owns all persisted state (per-user SQLite):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/state?user_id=` | Fetch a user's full session-state snapshot |
| `PUT` | `/state` | Persist a snapshot; removed/soft-deleted goals cascade out of the knowledge base |
| `DELETE` | `/state/{user_id}` | Archive then wipe a user's state (frontend Reset flow) |
| `GET` | `/knowledge-base/{goal_id}` | Pages pinned into that goal's durable knowledge base |
| `DELETE` | `/knowledge-base/{goal_id}?source=` | Unpin one source page |
| `GET` | `/stats` | Per-agent telemetry: calls, tokens, latency, validation retries |

## Configuration

The application uses Hydra for configuration management. Key configuration files:

- `config/main.yaml`: Main application settings
- `config/default.yaml`: Default configurations for all modules
- Environment variables can override YAML settings

### LLM Configuration Guide

#### Setting Up LLM Providers

GenMentor supports multiple LLM providers. Configure them using environment variables or by modifying the configuration files:

**Environment Variables (Recommended for API Keys):**
```bash
# OpenAI / any OpenAI-compatible gateway (provider: openai)
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_BASE_URL="https://your-gateway/v1"   # optional

# Tavily web search (search.provider: tavily) — free tier available
export TAVILY_API_KEY="tvly-..."

# DeepSeek direct (provider: deepseek)
export DEEPSEEK_API_KEY="your-deepseek-api-key"

# Anthropic
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# Ollama (local)
export OLLAMA_BASE_URL="http://localhost:11434"
```

**Configuration File (`config/default.yaml`):**
```yaml
llm:
  provider: openai    # Options: deepseek, openai, anthropic, ollama
  model_name: deepseek-chat
  base_url: null      # Custom base URL for API endpoints (e.g. an OpenAI-compatible gateway;
                      # OPENAI_BASE_URL in .env is also read natively by the OpenAI client)

# NOTE: keys unknown to config/schemas.py raise at startup (the composed config is
# merged into a structured schema), so typos fail fast instead of being ignored.
```

#### Available LLM Models

**DeepSeek Models:**
- `deepseek-chat` (default) - General purpose chat model
- `deepseek-coder` - Optimized for code generation and technical content

**OpenAI Models:**
- `gpt-4o` - Latest GPT-4 optimized model
- `gpt-4o-mini` - Cost-effective GPT-4 variant
- `gpt-3.5-turbo` - Fast and economical option

**Anthropic Models:**
- `claude-3-5-sonnet-20241022` - Latest Claude model (recommended)
- `claude-3-sonnet` - Balanced performance and speed
- `claude-3-haiku` - Fastest and most cost-effective

> Provider packages beyond DeepSeek/OpenAI-community are optional extras:
> `langchain-anthropic`, etc. Install the matching package for the provider you select.

**Ollama Models (Local):**
Any locally pulled tag works, e.g. `llama3.1`, `qwen2.5`, `mistral`.

#### Model Selection Guidelines

Defaults are deliberately frugal (`deepseek-chat`). General guidance:

- **Educational content**: mid-tier chat models are usually sufficient; step up only when drafting quality matters.
- **Code-heavy topics**: prefer a code-tuned model when the gateway offers one.
- **Cost control**: route cheaper models per request — every request accepts `model_provider`/`model_name`, and the frontend topbar switcher uses this.

### Embedding Configuration

Configure text embedding models for RAG functionality:

```yaml
embedding:
  provider: huggingface
  model_name: BAAI/bge-small-en-v1.5   # fast local default (384-dim)
  # Alternatives:
  # - BAAI/bge-m3                      # stronger multilingual, larger download
  # - provider: openai + text-embedding-3-small   # API embeddings (needs a serving endpoint)

# Changing the model changes the vector space: bump
# vectorstore.collection_name (we did: genmentor -> genmentor_v2) so stale
# collections are abandoned rather than mixed.
```

### Search and RAG Configuration

**Web Search:**
```yaml
search:
  provider: duckduckgo  # Options: tavily, serper, bing, brave, duckduckgo
  max_results: 5
  loader_type: web
  tavily_api_key: null        # falls back to TAVILY_API_KEY env var
  tavily_search_depth: basic  # basic | advanced

# Tavily returns page content with the search itself and skips per-page
# crawling — dramatically faster end-to-end than DuckDuckGo.

**Vector Store:**
```yaml
vectorstore:
  type: chroma
  persist_directory: data/vectorstore
  collection_name: genmentor_v2   # _v2: vector spaces differ across embedding models
```

**RAG Parameters:**
```yaml
rag:
  chunk_size: 1000          # Text chunk size for retrieval
  num_retrieval_results: 5  # Number of chunks to retrieve per query
  allow_parallel: true      # Enable parallel processing across knowledge points
  max_workers: 3            # Thread-pool width for drafting/page fetching
  max_stored_chunks: 2000   # Rolling cap on the search-result cache (oldest evicted)

# A sibling <collection>_kb store accumulates each goal's durable knowledge
# base (capped at kb_max_chunks_per_goal=400 by default); the tutor retrieves
# from it alongside fresh search.
```

### Server Configuration

```yaml
server:
  host: 127.0.0.1  # Bind address
  port: 5000       # Port number
```

### Environment-Specific Configuration

`config/main.yaml` composes over `config/default.yaml` (defaults first, `_self_`
last), so overrides live in `main.yaml` — server host/port, log level, and any
module settings you want to pin:

```yaml
# config/main.yaml
defaults:
  - default
  - _self_

server:
  host: 0.0.0.0   # expose beyond localhost only behind real auth!
  port: 8080
```

Deployment-relevant env vars: `GENMENTOR_UPLOAD_DIR` (CV upload directory),
`GENMENTOR_STATE_DB` (state database path), plus the provider keys above.

### RAG and Search Configuration

The system supports multiple search providers:
- **DuckDuckGo**: Web search integration
- **ChromaDB**: Vector storage for document retrieval
- **Sentence Transformers**: Text embeddings

## Data Flow

1. **Learner Input**: CV upload, learning goals, or direct information
2. **Skill Analysis**: Identifies gaps between current skills and learning objectives
3. **Profile Creation**: Builds comprehensive learner profile with adaptive modeling
4. **Path Planning**: Generates personalized learning sequences
5. **Content Generation**: Creates tailored learning materials with optional quizzes
6. **Interactive Learning**: AI tutor provides conversational support throughout

## Development

### Project Structure

```
backend/
├── main.py                    # FastAPI application entry point
├── api_schemas.py            # Pydantic models for API requests
├── requirements.txt          # Python dependencies
├── config/                   # Configuration files
│   ├── main.yaml
│   ├── default.yaml
│   └── loader.py
├── base/                     # Core components and factories
│   ├── llm_factory.py
│   ├── rag_factory.py
│   ├── embedder_factory.py
│   └── search_rag.py
├── modules/                  # Feature modules
│   ├── ai_chatbot_tutor/
│   ├── skill_gap_identification/
│   ├── adaptive_learner_modeling/
│   ├── personalized_resource_delivery/
│   └── learner_simulation/
├── tests/                    # Pytest suite (CI runs it)
└── utils/                    # Utility functions
    ├── preprocess.py         # PDF text extraction, name sanitising
    ├── llm_output.py         # LLM response parsing (<think>, JSON extraction)
    ├── telemetry.py          # Per-agent call/token/latency stats (GET /stats)
    └── state_store.py        # Server-owned per-user state database
```

### Adding New Features

1. Create a new module under `modules/`
2. Define schemas in `modules/your_module/schemas.py`
3. Implement agents in `modules/your_module/agents/`
4. Add prompts in `modules/your_module/prompts/`
5. Register endpoints in `main.py`
6. Update API schemas in `api_schemas.py`

### Testing

A pytest suite lives in `tests/` (API contracts, schemas, JSON extraction,
RAG scoping/pruning, search providers, parallel behaviour):

```bash
pytest tests -q          # from backend/
```

Note: test runs finish cleanly, but chromadb's native extension can abort
during interpreter teardown on some platforms — CI wraps pytest with
`os._exit()` for this reason (see .github/workflows/ci.yml).

## Dependencies

Key dependencies include:
- **FastAPI**: Web framework
- **LangChain**: LLM orchestration
- **Hydra**: Configuration management
- **Pydantic**: Data validation
- **ChromaDB**: Vector database
- **HuggingFace sentence-transformers / BGE**: Text embeddings
- **ddgs / Tavily**: Web search providers

## License

This project is part of the GenMentor research initiative.

## Support

For issues and questions, please refer to the project documentation or create an issue in the repository.