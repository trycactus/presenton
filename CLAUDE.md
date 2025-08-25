# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Presenton is an open-source AI presentation generator with a dual-architecture approach:
- **Frontend**: Next.js 14 application serving the UI and presentation templates
- **Backend**: FastAPI server handling AI generation, document processing, and PPTX export
- **Deployment**: Docker containerization with development and production configurations

## Development Commands

### Docker-based Development (Recommended)
```bash
# Development with live reload
docker compose up development

# Development with GPU support (for Ollama)
docker compose up development-gpu

# Production build
docker compose up production

# Production with GPU support
docker compose up production-gpu
```

### Next.js Frontend (standalone)
```bash
cd servers/nextjs
npm install
npm run dev      # Development server on port 3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint check
```

### FastAPI Backend (standalone)
```bash
cd servers/fastapi
# Install with uv (recommended)
uv install

# Run development server
python server.py --port 8000 --reload true

# Run tests
pytest
```

### Build and Deploy
```bash
# Build container image (see BUILD_AND_PUSH.md for full commands)
docker build -t presenton .

# Multi-platform build for deployment
docker buildx build --platform linux/amd64 -t IMAGE_NAME --push .
```

## Architecture Overview

### Frontend Architecture (Next.js)
- **App Router**: Uses Next.js 13+ app directory structure
- **State Management**: Redux Toolkit with three main slices:
  - `presentationGeneration`: Manages presentation creation flow
  - `presentationGenUpload`: Handles document uploads and processing
  - `userConfig`: Stores user configuration and API keys
- **Template System**: React components in `presentation-templates/` define slide layouts
  - Templates are grouped by theme (`classic`, `modern`, `professional`, `general`)
  - Each template has `settings.json` for metadata and multiple `.tsx` layout components
  - Templates use Zod schemas for structured data validation
- **Styling**: Tailwind CSS with shadcn/ui components, custom theme support
- **Key Features**:
  - Real-time presentation preview with edit capability
  - Template-based slide generation
  - PPTX and PDF export functionality
  - Document upload processing (PDF, DOCX, TXT, PPTX)

### Backend Architecture (FastAPI)
- **API Structure**: RESTful API with versioned endpoints (`/api/v1/ppt/`)
- **Core Services**:
  - `llm_client.py`: Multi-provider LLM integration (OpenAI, Google, Anthropic, Ollama)
  - `pptx_presentation_creator.py`: PPTX file generation from templates
  - `documents_loader.py`: Document processing and chunking
  - `image_generation_service.py`: AI image generation integration
- **Database**: SQLite with SQLModel ORM, supports external SQL databases
- **Document Processing**: Docling service for advanced document parsing
- **MCP Server**: Model Context Protocol server implementation (`mcp_server.py`)

### Template System Deep Dive
Templates are React components that receive structured data and render slide content. Key concepts:
- **Slide Layouts**: Individual React components for different slide types
- **Schema Validation**: Zod schemas define expected data structure for each template
- **Dynamic Loading**: Templates loaded dynamically based on user selection
- **Image/Icon Integration**: Special schemas for AI-generated images and icon placement

### Data Flow
1. **User Input**: Prompt + configuration (slides, language, template) via frontend
2. **Document Processing**: Optional documents processed and chunked by backend
3. **AI Generation**: LLM generates structured presentation outline and slide content
4. **Template Rendering**: Frontend renders slides using selected template
5. **Export**: Backend converts rendered content to PPTX/PDF format

## Environment Configuration

Key environment variables (see docker-compose.yml for full list):
- **LLM Provider**: `LLM` (openai/google/anthropic/ollama/custom)
- **API Keys**: `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`
- **Models**: `OPENAI_MODEL`, `GOOGLE_MODEL`, `ANTHROPIC_MODEL`, `OLLAMA_MODEL`
- **Image Provider**: `IMAGE_PROVIDER` (dall-e-3/gemini_flash/pexels/pixabay)
- **Feature Flags**: `TOOL_CALLS`, `WEB_GROUNDING`, `DISABLE_THINKING`
- **Database**: `DATABASE_URL` for external database connection
- **Security**: `CAN_CHANGE_KEYS` to lock API key configuration

## Testing

### Next.js Tests
```bash
cd servers/nextjs
# Cypress component testing
npx cypress open --component
```

### FastAPI Tests
```bash
cd servers/fastapi
pytest
# Run specific test
pytest tests/test_presentation_generation_api.py
# Run with coverage
pytest --cov=.
```

## Key File Locations

### Frontend Critical Files
- `app/layout.tsx`: Root layout with providers
- `store/store.ts`: Redux store configuration
- `presentation-templates/`: All slide layout templates
- `app/(presentation-generator)/`: Main app routes and components
- `utils/constant.ts`: Frontend configuration constants

### Backend Critical Files
- `api/main.py`: FastAPI application setup
- `api/v1/ppt/router.py`: Main API endpoints
- `services/llm_client.py`: LLM integration abstraction
- `services/pptx_presentation_creator.py`: PPTX generation logic
- `models/`: Pydantic models for API requests/responses
- `utils/llm_calls/`: LLM-specific prompt templates

### Configuration Files
- `docker-compose.yml`: Multi-service development setup
- `servers/nextjs/next.config.mjs`: Next.js proxy configuration for development
- `servers/fastapi/pyproject.toml`: Python dependencies and project metadata

## Development Workflow Notes

- **Template Development**: Create new slide layouts in `presentation-templates/[theme]/` with corresponding entries in `settings.json`
- **API Extension**: Add new endpoints in `api/v1/ppt/router.py` following existing patterns
- **LLM Integration**: Extend `llm_client.py` for new providers or modify prompt templates in `utils/llm_calls/`
- **Frontend State**: Use Redux slices for state management, avoid direct API calls in components
- **Styling**: Follow Tailwind utility classes, use shadcn/ui components for consistency