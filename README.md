<div align="center">
  <p align="center">
    <img src="resources/logo.svg" alt="GenMentor" width="360"/>
  </p>
  <p><b>LLM-powered & Goal-oriented Tutoring System</b></p>
  <p>
    <a href="https://gen-mentor.vercel.app">Live app</a> &nbsp;·&nbsp;
    <a href="https://www.tianfuwang.tech/gen-mentor">Website</a> &nbsp;·&nbsp;
    <a href="https://arxiv.org/pdf/2501.15749">Paper</a> &nbsp;·&nbsp;
    <a href="https://youtu.be/vTdtGZop-Zc">Video</a>
  </p>
</div>

---

GenMentor is the official implementation of *LLM-powered Multi-agent Framework for Goal-oriented
Learning in Intelligent Tutoring System* (WWW 2025, Industry Track, oral). You tell it where you
want to be; a set of coordinated agents refines the goal, finds the gap between it and your
background, schedules a path of sessions, writes each session's reading and quiz for you, and
rebuilds your learner profile from what you actually did.

This repository is a single Next.js application. There is no account and no server-side
database: the learner's archive lives in the browser and can be exported and imported as one
JSON file. Agent calls run inside the app's API routes against any OpenAI-compatible endpoint
or the Anthropic API.

## Paradigms and agents

<div align="center">
  <img src="resources/its-paradigms.png" alt="ITS paradigms" width="500"/>
</div>

| Paradigm | Typical characteristics | Primary focus |
|---|---|---|
| Traditional MOOC | Static syllabus; pre-recorded lectures; fragmented learning | Broad access, low personalization |
| Chatbot ITS | Reactive Q&A; rule/LLM-driven; session-based help | Instant support, limited long-term adaptation |
| **Goal-oriented ITS** | Proactive planning; personalized paths; goal-aligned assessments | Targeted skill acquisition, continual adaptation |

<div align="center">
  <img src="resources/genmentor-framework.png" alt="GenMentor framework" width="700"/>
</div>

| Agent | Route | What it does |
|---|---|---|
| Goal Refiner | `POST /api/refine-goal` | Turns a vague goal into an actionable one |
| Skill Mapper + Skill Gap Identifier | `POST /api/identify-skill-gap` | Maps the goal to skills, infers the learner's level for each |
| Adaptive Learner Profiler | `POST /api/profile` | Builds the profile, then rebuilds it after every session with quiz evidence |
| Learning Path Scheduler | `POST /api/schedule-path` | Creates, refines and reschedules the session sequence (streamed) |
| Knowledge Explorer | `POST /api/explore-knowledge` | Picks the knowledge points a session needs |
| Knowledge Drafter | `POST /api/draft-knowledge` | Drafts each point, optionally grounded in web search (streamed) |
| Document Integrator | `POST /api/integrate-document` | Synthesizes the drafts into one document (streamed) |
| Quiz Generator | `POST /api/generate-quiz` | Writes questions from the document |
| Learner Feedback Simulator | `POST /api/simulate-feedback` | Role-plays the learner to critique a path or content |
| AI Chatbot Tutor | `POST /api/tutor` | Streams grounded answers during a session |

The prompts are the paper's prompts. The verbatim port is preserved at git tag
`prompts-baseline`; later edits are evaluated side by side against it
(`scripts/eval-prompts.sh`, `wiki/reviews/`).

## Quick start

Requirements: Node 24, pnpm 11, and one LLM credential.

```bash
make install                      # pnpm install in app/
cp app/.env.example app/.env.local
# set LLM_API_KEY and LLM_BASE_URL (or OPENAI_API_KEY / ANTHROPIC_API_KEY)
make dev                          # http://localhost:3000
```

Learners can also bring their own key from the app (the key icon in the sidebar): it stays in
their browser and is sent with each request, so a public deployment can run without a server key.

`LLM_FAST_MODEL` and `LLM_SMART_MODEL` split the work between a cheap model (tutor, quizzes,
goal refinement) and a stronger one (skill gap, scheduling, content). Defaults and the other
knobs are documented in `app/.env.example`.

No key at hand? `GENMENTOR_LLM_MODE=replay make dev` serves the recorded journeys in
`e2e/fixtures/llm` for the sample goal used by the tests.

### Deploy

| Target | How |
|---|---|
| Vercel | The public instance at [gen-mentor.vercel.app](https://gen-mentor.vercel.app) ships without a server key: visitors add their own provider, key and models in **Model** settings. To run your own, import the repo with **Root Directory** `app` and optionally add the environment variables |
| Container | `docker build -t genmentor app && docker run -p 3000:3000 --env-file app/.env.local genmentor` |

## Repository layout

```
app/          the Next.js application (routes, agents, prompts, schemas, UI)
e2e/          Playwright journeys, axe checks, screenshot evidence, recorded LLM fixtures
wiki/         product proposal, roadmap, architecture, design principles, API reference, pitfalls
scripts/      gate.sh and verify-ui.sh (acceptance gates), eval-prompts.sh (prompt evaluation)
docs/rebuild/ the plan this rebuild followed
```

`make gate` runs the static acceptance gate (layout, docs, size budgets, banned patterns,
types, lint, unit tests, build). `make verify-ui` builds the app, drives every journey in the
browser, checks accessibility in both themes and screenshots every page in three viewports.
`AGENTS.md` holds the constraints every contributor, human or agent, works under.

## Reproducing the paper

The Python implementation used for the paper (FastAPI backend, Streamlit frontend, LangChain
agents) lives on the **`v0.1-demo`** branch, also tagged `v0.1.0` and `paper-python-v1`:

```bash
git checkout v0.1-demo
```

Its README describes how to run it. That branch is frozen as the demo version; all further work
happens on `main`, which keeps the same nine agents and the same prompts (see `prompts-baseline`),
rewritten in TypeScript.

## Citation

```bibtex
@inproceedings{wang2025llm,
  title={LLM-powered Multi-agent Framework for Goal-oriented Learning in Intelligent Tutoring System},
  author={Wang, Tianfu and Zhan, Yi and Lian, Jianxun and Hu, Zhengyu and Yuan, Nicholas Jing and Zhang, Qi and Xie, Xing and Xiong, Hui},
  booktitle={Companion Proceedings of the ACM Web Conference},
  year={2025}
}
```

## License

See `LICENSE`.
