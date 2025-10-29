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
# DeepSeek (default)
export DEEPSEEK_API_KEY="your-deepseek-api-key"

# OpenAI
export OPENAI_API_KEY="your-openai-api-key"

# Anthropic
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# Ollama (local)
export OLLAMA_BASE_URL="http://localhost:11434"
```

**Configuration File (`config/default.yaml`):**
```yaml
llm:
  provider: deepseek  # Options: deepseek, openai, anthropic, ollama
  model_name: deepseek-chat
  base_url: null      # Custom base URL for API endpoints
  temperature: 0      # Response randomness (0-1)
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

**Ollama Models (Local):**
- `llama2` - Meta's Llama 2
- `mistral` - Mistral AI model
- `codellama` - Code-optimized Llama variant

#### Model Selection Guidelines

**For Educational Content:**
- Use `deepseek-chat` or `claude-3-sonnet` for balanced quality and cost
- Use `gpt-4o` for premium content quality
- Use `deepseek-coder` for technical/programming topics

**For Code Generation:**
- `deepseek-coder` - Best for Chinese and English programming content
- `claude-3-5-sonnet` - Excellent for complex coding tasks
- `gpt-4o` - Reliable for general programming assistance

**For Cost Optimization:**
- `gpt-4o-mini` - Good performance at lower cost
- `claude-3-haiku` - Fast responses, minimal cost
- `deepseek-chat` - Competitive pricing with good quality

### Embedding Configuration

Configure text embedding models for RAG functionality:

```yaml
embedding:
  provider: huggingface
  model_name: sentence-transformers/all-mpnet-base-v2
  # Alternative models:
  # - sentence-transformers/all-MiniLM-L6-v2 (faster, lighter)
  # - text-embedding-ada-002 (OpenAI)
  # - text-embedding-3-small (OpenAI, newer)
```

### Search and RAG Configuration

**Web Search:**
```yaml
search:
  provider: duckduckgo  # Options: duckduckgo, serper, google
  max_results: 5
  loader_type: web
```

**Vector Store:**
```yaml
vectorstore:
  persist_directory: data/vectorstore
  collection_name: genmentor
```

**RAG Parameters:**
```yaml
rag:
  chunk_size: 1000          # Text chunk size for retrieval
  num_retrieval_results: 5  # Number of chunks to retrieve
  allow_parallel: true      # Enable parallel processing
  max_workers: 3           # Maximum parallel workers
```

### Server Configuration

```yaml
server:
  host: 127.0.0.1  # Bind address
  port: 5000       # Port number
```

### Environment-Specific Configuration

Create environment-specific configs by copying `config/main.yaml` to `config/prod.yaml` or `config/dev.yaml`:

```yaml
# config/prod.yaml
defaults:
  - default
  - _self_

debug: false
log_level: INFO

llm:
  provider: openai
  model_name: gpt-4o
  temperature: 0.1

server:
  host: 0.0.0.0
  port: 8080
```

Run with specific config:
```bash
python main.py --config-name=prod
```

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
└── utils/                    # Utility functions
    ├── preprocess.py
    └── llm_output.py
```

### Adding New Features

1. Create a new module under `modules/`
2. Define schemas in `modules/your_module/schemas.py`
3. Implement agents in `modules/your_module/agents/`
4. Add prompts in `modules/your_module/prompts/`
5. Register endpoints in `main.py`
6. Update API schemas in `api_schemas.py`

### Testing

The project includes an `api_tester/` directory with testing utilities. Run tests using:

```bash
python -m pytest test_config.py
```

## Dependencies

Key dependencies include:
- **FastAPI**: Web framework
- **LangChain**: LLM orchestration
- **Hydra**: Configuration management
- **Pydantic**: Data validation
- **ChromaDB**: Vector database
- **Sentence Transformers**: Text embeddings
- **DuckDuckGo Search**: Web search

## License

This project is part of the GenMentor research initiative.

## Support

For issues and questions, please refer to the project documentation or create an issue in the repository.