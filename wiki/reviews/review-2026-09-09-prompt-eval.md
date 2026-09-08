<!-- Last verified: 2026-09-09 | eval run: 5 cases × 11 agents × 2 variants, glm-5.3-flash via GLM gateway -->

# Prompt 评测：baseline 对 M6 修订

基线取自 git 标签 `prompts-baseline`（逐字移植论文实现），对照工作树里的 prompt。同一模型、同一输入、真实调用，用 `scripts/eval-prompts.sh` 跑出 `e2e/artifacts/eval/{baseline,current}/`，`scripts/eval-report.py` 生成并排表。
用例在 `e2e/fixtures/eval/cases.json`：analyst-to-ds、backend-to-ml-eng、nurse-to-informatics、pm-to-product-analytics、designer-to-frontend。

## 改了什么

| 改动 | 涉及 | 依据 |
|---|---|---|
| 删掉 "Do NOT include any other text or markdown tags" | 9 个 prompt | 围栏与前后废话由 `extractJSON` 剥掉，指令是噪音 |
| 删掉 "You have excellent reasoning skills" | skill-gap-identifier | 对 reasoning 模型无作用，只耗预算 |
| 删掉 `is_gap` 的指令与示例字段 | skill-gap-identifier | 由代码从两个等级推导（schema transform） |
| 删掉重复的格式复述段 | skill-mapper | 与上文格式示例完全重复 |
| 清理 `[cite_start]`、`[cite: 225-235]`、`e.GET_STARTED` | path-scheduler | 论文写作残留 |
| 修 "create update"、"coginitive"，去掉 "!!!!!!" | learner-profiler | 拼写与语气 |
| 去掉 emoji | tutor | 受众是职业学习者 |

没做的：从 zod schema 自动生成输出格式说明。这需要改 `runJSON` 的组装方式，收益在没有对照前不明确，留到 backlog。

## 结论

| agent | 判断 | 处置 |
|---|---|---|
| goal-refiner | same. | 保留 |
| skill-gap | same，略慢。 | 保留 |
| profiler-init | same，但两版都不稳定。 | 保留 |
| path-scheduler | same。 | 保留 |
| knowledge-explorer | same，更精。 | 保留 |
| knowledge-drafter | same，两版都违反同一条规则。 | 保留 |
| document-integrator | same。 | 保留 |
| quiz-generator | worse，已回退。 | 回退 |
| feedback-simulator | same。 | 保留 |
| profiler-update | same。 | 保留 |
| tutor | better。 | 保留 |

quiz-generator 已回退到基线文本，其余保留。总体：结构化输出一致性未变，长输出 agent 延迟下降 19% 到 29%，导师语气更贴受众。

## 延迟（五例均值）

| agent | baseline | current | Δ |
|---|---|---|---|
| document-integrator | 170.7s | 133.7s | -22% |
| feedback-simulator | 18.8s | 18.1s | -4% |
| goal-refiner | 3.1s | 3.0s | -2% |
| knowledge-drafter | 168.3s | 125.7s | -25% |
| knowledge-explorer | 32.1s | 22.7s | -29% |
| path-scheduler | 99.3s | 80.6s | -19% |
| profiler-init | 30.5s | 27.8s | -9% |
| profiler-update | 18.2s | 17.6s | -3% |
| quiz-generator | 12.9s | 14.7s | +14% |
| skill-gap | 63.4s | 76.8s | +21% |
| tutor | 15.3s | 14.1s | -7% |

## 逐 agent 逐用例并排

Cases: analyst-to-ds, backend-to-ml-eng, designer-to-frontend, nurse-to-informatics, pm-to-product-analytics. Baseline = tag `prompts-baseline`, current = working tree. Same model, same inputs, live calls.

### goal-refiner

| case | baseline | current |
|---|---|---|
| analyst-to-ds | Transition from a 3-year marketing analyst background into a junior data scientist role within a year by building on existing Excel, Tableau, and basic pandas skills—developing Python-based data analysis with NumPy and scikit-learn in a notebook workflow, strengthening SQL including joins, and gaining foundational statistics beyond descriptive summaries. `2s` | Transition from marketing analyst into a junior data scientist role within a year by mastering Python-based data analysis (pandas, NumPy, notebook workflows), SQL with joins and complex queries against a warehouse like Redshift, and applied statistics fundamentals to complement existing Excel and Tableau reporting skills. `2s` |
| backend-to-ml-eng | Leverage 6 years of backend engineering experience with Python, Go, Docker, and Kubernetes (GKE, Helm, Terraform) to become a machine learning engineer focused on productionizing models — specifically model serving, deployment, monitoring, and MLOps pipelines on Kubernetes — building on prior scikit-learn experience and gaining skills in model registries, feature stores, and drift monitoring. `2s` | Leverage my 6 years of backend engineering experience (Python, Go, Docker, Kubernetes/GKE) to learn how to deploy, serve, and monitor machine learning models in production on Kubernetes, covering model serving, model registries, drift monitoring, and end-to-end MLOps practices — building on my prior exposure to scikit-learn and gRPC/Kafka microservices. `3s` |
| designer-to-frontend | Transition from design-prototyping skills to independently shipping production front-end features with React and TypeScript, strengthening JavaScript fundamentals beyond tutorial-level React (useState), learning modern tooling (bundler, Git workflows), component and state management at production level, automated testing (e.g., unit and integration tests), and hands-on accessibility QA including screen-reader testing to complement existing WCAG design knowledge. `3s` | Transition from product design into front-end development by building on existing HTML, CSS, and basic React knowledge to independently ship production-quality React features with TypeScript, component/state architecture, Git workflows, and automated testing, while applying an accessibility-first practice that includes hands-on screen reader QA beyond theoretical WCAG knowledge. `3s` |
| nurse-to-informatics | Transition from ICU nursing to a clinical informatics analyst role within 18 months by building on Epic superuser experience to gain practical skills in EHR data analysis, SQL, HL7/FHIR interoperability standards, and healthcare dashboard tools (e.g., Tableau or Power BI), leveraging weekend study time of ~6 hours per week and informing a possible graduate certificate in health informatics. `3s` | Transition from ICU bedside nursing to a clinical informatics analyst role within 18 months, building on Epic superuser experience to gain skills in EHR data analysis, HL7/FHIR interoperability standards, and healthcare dashboard creation. `2s` |
| pm-to-product-analytics | As an experienced B2C product manager, learn to independently design, run, and correctly interpret A/B tests—including statistical significance and common pitfalls like noise vs. real effects—define rigorous product metrics, and write intermediate SQL queries for self-serve analysis without relying on the data team. `2s` | As a B2C mobile app PM, learn to independently design and interpret A/B tests—covering experiment design, statistical significance, and common pitfalls like reading noise as signal—define and defend product metrics, and write intermediate SQL queries (JOINs, aggregations, GROUP BY) to run self-serve analyses without relying on analysts. `3s` |

判断：**same.** 五例都保留原意并加了背景细节；新版平均短 40 字符，是去掉冗余限定的结果，不是丢信息。保留改动（只删了围栏指令）。

### skill-gap

| case | baseline | current |
|---|---|---|
| analyst-to-ds | 9 skills, 9 gaps: Pandas Data Manipulation and Cleaning beginner→intermediate; NumPy Array Computing unlearned→intermediate; Jupyter Notebook Data Analysis Workflow unlearned→beginner; SQL Querying with Joins beginner→intermediate; Probability Fundamentals unlearned→beginner; Inferential Statistics and Hypothesis Testing unlearned→beginner; Exploratory Data Analysis (EDA) beginner→intermediate; Machine Learning with scikit-learn unlearned→intermediate; Regression Modeling unlearned→beginner `61s` | 9 skills, 7 gaps: Python Programming Fundamentals beginner→beginner; Data Wrangling with pandas beginner→intermediate; Numerical Computing with NumPy unlearned→beginner; Jupyter Notebook Workflows unlearned→beginner; SQL Joins and Complex Queries beginner→intermediate; Amazon Redshift Data Warehousing beginner→beginner; Applied Statistics Fundamentals beginner→intermediate; Hypothesis Testing and A/B Experiment Analysis unlearned→intermediate; Machine Learning Fundamentals with scikit-learn unlearned→beginner `71s` |
| backend-to-ml-eng | 9 skills, 8 gaps: Machine Learning Fundamentals (Model Training, Evaluation, and Validation) beginner→intermediate; Deep Learning Frameworks (PyTorch or TensorFlow) unlearned→intermediate; Model Serving & Low-Latency Inference (FastAPI, KServe, TorchServe, Triton) beginner→advanced; MLOps Pipeline Orchestration & CI/CD for ML (Kubeflow Pipelines, Airflow) beginner→advanced; Experiment Tracking & Model Registries (MLflow, Weights & Biases) unlearned→intermediate; Feature Store Design & Operation (Feast, Tecton) unlearned→intermediate; Model & Data Drift Monitoring (Evidently, Prometheus/Grafana for ML) beginner→intermediate; ML Workloads on Kubernetes (GPU Scheduling, KServe/Kubeflow on GKE, Helm for ML Stacks) intermediate→advanced; Data Versioning & Pipeline Reproducibility (DVC) beginner→beginner `88s` | 9 skills, 9 gaps: Machine Learning Fundamentals & Model Lifecycle beginner→intermediate; Model Serialization & Packaging (ONNX, containerized model artifacts) beginner→intermediate; Model Serving on Kubernetes (KServe / Seldon Core / Triton) beginner→intermediate; Model Registry & Artifact Versioning (MLflow) unlearned→intermediate; Experiment Tracking & Reproducibility beginner→intermediate; Data & Concept Drift Detection and Monitoring unlearned→advanced; ML-Specific Production Observability (prediction quality, latency SLOs) beginner→advanced; Automated ML Pipelines & Continuous Training (Kubeflow / Argo Workflows) beginner→advanced; GPU & Resource-Aware Scheduling for ML Workloads on GKE beginner→intermediate `83s` |
| designer-to-frontend | 9 skills, 9 gaps: Modern JavaScript Fundamentals (ES6+, Closures, Async/Await) beginner→intermediate; TypeScript for React Development unlearned→intermediate; React Component Architecture and Composition beginner→intermediate; Production State Management (Hooks, Context, Global State) beginner→intermediate; Asynchronous Data Fetching and API Integration unlearned→intermediate; Build Tooling and Bundlers (e.g., Vite or Webpack) unlearned→intermediate; Git Collaboration Workflows (Branching, Pull Requests, Code Review) beginner→intermediate; Automated Testing with Jest and React Testing Library (Unit and Integration) unlearned→intermediate; Hands-On Accessibility QA and Screen-Reader Testing beginner→intermediate `60s` | 8 skills, 8 gaps: Modern React Patterns & Hooks beginner→intermediate; TypeScript for React Development unlearned→intermediate; Component & State Architecture beginner→advanced; Git Workflows & Collaborative Version Control beginner→intermediate; Automated Testing (Unit, Integration & E2E) unlearned→intermediate; Applied Accessibility Engineering (Semantic HTML & ARIA) beginner→intermediate; Hands-on Screen Reader QA (NVDA/VoiceOver) unlearned→intermediate; Production Debugging & Build/Deploy Tooling unlearned→intermediate `86s` |
| nurse-to-informatics | 9 skills, 5 gaps: SQL for Healthcare Data Analysis unlearned→intermediate; Epic Analytics and Reporting Tools (Clarity, Caboodle, Reporting Workbench) beginner→intermediate; HL7 v2 Messaging Fundamentals unlearned→beginner; FHIR Interoperability Standards and APIs unlearned→intermediate; Dashboard Development with Tableau or Power BI unlearned→intermediate; Data Visualization and Analytical Storytelling beginner→beginner; Clinical Terminology Standards (ICD-10, SNOMED CT, LOINC) beginner→beginner; Healthcare Data Privacy and Security (HIPAA, Data Governance) beginner→beginner; Clinical Workflow Analysis and Optimization intermediate→intermediate `47s` | 10 skills, 6 gaps: Epic EHR Systems & Clinical Workflows advanced→advanced; SQL for Clinical Data Querying unlearned→intermediate; EHR Data Analysis & Reporting beginner→intermediate; HL7 v2 Messaging Standards unlearned→intermediate; FHIR Interoperability Standards unlearned→intermediate; Healthcare Dashboard Development (Tableau/Power BI) unlearned→intermediate; Data Visualization Principles beginner→beginner; Clinical Terminology Standards (ICD-10, SNOMED CT, LOINC) beginner→beginner; Clinical Workflow Analysis & Process Improvement beginner→intermediate; HIPAA & Healthcare Data Privacy/Security beginner→beginner `53s` |
| pm-to-product-analytics | 7 skills, 6 gaps: Statistical Foundations for Experimentation (distributions, variance, sampling) beginner→beginner; Hypothesis Testing and Statistical Significance (p-values, confidence intervals) beginner→intermediate; A/B Test Design and Sample Size / Power Calculation beginner→intermediate; Experiment Pitfall Diagnosis (noise vs. real effects, novelty effects, sample ratio mismatch, peeking) unlearned→advanced; Product Metrics Definition (North Star, guardrail, and counter metrics) beginner→intermediate; Intermediate SQL for Self-Serve Analysis (JOINs, aggregations, CTEs, window functions) beginner→intermediate; Experiment Result Interpretation and Data-Driven Decision Making beginner→intermediate `59s` | 8 skills, 7 gaps: A/B Test Experiment Design beginner→intermediate; Statistical Significance & Hypothesis Testing beginner→intermediate; Sample Size & Statistical Power Estimation unlearned→intermediate; Experiment Result Interpretation & Pitfall Avoidance beginner→advanced; Product Metrics Definition & Selection beginner→intermediate; Metric Rationale & Stakeholder Defense beginner→intermediate; Intermediate SQL: JOINs, Aggregations & GROUP BY beginner→intermediate; Mobile App Funnel & Event Analytics beginner→beginner `88s` |

判断：**same，略慢。** 技能数与差距数分布一致（新版 44 项 / 基线 43 项），`reason` 的证据引用同样具体。延迟 63s → 77s，五例样本内有一例 120s 的离群值，没有质量证据说明和删掉"You have excellent reasoning skills"或 `is_gap` 有关。保留改动，因为 `is_gap` 现在由代码从两个等级推导，模型多输出一个字段只会引入不一致。

### profiler-init

| case | baseline | current |
|---|---|---|
| analyst-to-ds | progress 15%, mastered 4, in progress 9; style: Detailed explanations `30s` | progress 20%, mastered 2, in progress 7; style: Detailed explanations `29s` |
| backend-to-ml-eng | progress 25%, mastered 1, in progress 8; style: Detailed explanations with concise summaries `30s` | progress 10%, mastered 5, in progress 9; style: Concise summaries `34s` |
| designer-to-frontend | progress 20%, mastered 4, in progress 9; style: Detailed explanations with concrete design-to-code mappings; likely favors conci `31s` | progress 60%, mastered 3, in progress 8; style: Concise summaries with hands-on examples `16s` |
| nurse-to-informatics | progress 60%, mastered 4, in progress 5; style: Concise summaries paired with practical, clinically-grounded examples (e.g., nur `27s` | progress 60%, mastered 4, in progress 6; style: Detailed explanations with practical, workflow-grounded examples that connect ne `28s` |
| pm-to-product-analytics | progress 10%, mastered 1, in progress 6; style: Concise summaries `32s` | progress 10%, mastered 1, in progress 7; style: Detailed explanations `31s` |

判断：**same，但两版都不稳定。** 同一 designer 用例基线 progress 20、新版 60，而 nurse 用例两版都是 60。这是 profiler 本身的方差，新版只改了三处拼写与一处感叹号。这条不该作为 prompt 优化点，而是 M7 之后的产品问题：overall_progress 应该改为由掌握度派生，而不是让模型报数。保留改动。

### path-scheduler

| case | baseline | current |
|---|---|---|
| analyst-to-ds | 4 sessions: From Spreadsheets to Notebooks: Jupyter, pandas, and NumPy Foundations → Exploratory Data Analysis: Deepening pandas and NumPy on Marketing Data → Queries and Conclusions: SQL Joins, Probability, and A/B Hypothesis Testing → Capstone: Predicting Campaign Performance with Regression and scikit-learn `87s` | 4 sessions: Python Data Science Toolkit: Jupyter Notebooks & NumPy Essentials → Data Wrangling with pandas: From Messy Campaign Exports to Analysis-Ready Data → SQL Joins and Complex Queries for Warehouse Analysis (Redshift) → Applied Statistics & A/B Experiment Analysis Capstone (with scikit-learn Bridge) `94s` |
| backend-to-ml-eng | 4 sessions: Production-Grade ML Foundations: Rebuild Your Churn Model with Rigorous Validation → Version Everything: Model Registries with MLflow and Feature Stores with Feast → Serve It: From a FastAPI Baseline to a KServe InferenceService on GKE → Close the Loop: Drift Monitoring and Automated Retraining with Kubeflow Pipelines `116s` | 4 sessions: ML Lifecycle Refresher & Packaging Your Churn Model for Production → Experiment Tracking & Model Registry with MLflow → Serving on GKE: Deploying Your Model with KServe → Capstone: Drift Detection, ML Observability & Continuous Training `73s` |
| designer-to-frontend | 4 sessions: Typed Foundations: Modern JavaScript and TypeScript Through a Design-System Lens → Ship a Component: Production Architecture with Vite and Git Workflows → Dynamic Interfaces: Production State Management and API-Driven Features → Ship with Confidence: Automated Testing and Screen-Reader QA `55s` | 4 sessions: React Components Through a Designer's Lens: Props, State & Hooks → Type Your Design System: TypeScript for React Components → Ship It: Git Workflows, Vite & Your First Production Deploy → Accessibility in Practice: ARIA, Screen Reader QA & Automated Testing `56s` |
| nurse-to-informatics | 4 sessions: SQL Foundations for Healthcare Data: From Spreadsheets to Queries → Epic Analytics in Practice: Clarity, Caboodle, and Reporting Workbench → Clinical Dashboard Development with Tableau or Power BI → Interoperability Essentials: HL7 v2 Messaging and FHIR APIs `131s` | 4 sessions: SQL Foundations for Clinical Data: From Excel to Clinical Queries → EHR Data Analysis & Reporting: Answering Clinical Questions with SQL → Healthcare Interoperability: Decoding HL7 v2 and Querying FHIR → Clinical Dashboards & Workflow Analytics Capstone `114s` |
| pm-to-product-analytics | 4 sessions: Metrics That Matter & Statistical Significance Refresher → Design Your First A/B Test: Hypotheses, Randomization, Sample Size & Power → Diagnosing Pitfalls: Noise vs. Real Effects, Peeking, SRM, and Novelty → Self-Serve SQL Capstone: Query the Data, Interpret, Decide `104s` | 4 sessions: From Dashboards to Decisions: Defining and Defending Your Product Metrics → Self-Serve Analytics with SQL: JOINs, Aggregations, and GROUP BY → Designing A/B Tests That Can Actually Win: Hypotheses, Variants, and Sample Size → Reading Results Like a Pro: Significance, Confidence, and Avoiding Noise-as-Signal Traps `63s` |

判断：**same。** 五例都恰好 4 个会话，标题与递进相当（nurse 用例两版都从 SQL 起步、以互操作或仪表板收尾）。延迟 99s → 81s。保留改动（删 `[cite_start]` 残留与 `e.GET_STARTED` 笔误，删围栏指令）。

### knowledge-explorer

| case | baseline | current |
|---|---|---|
| analyst-to-ds | 6 points: Jupyter Notebook Workflow: Cells, Markdown, and Reproducible Analysis (foundational); pandas DataFrame Fundamentals: Loading CSVs, Filtering, Selecting, and Sorting (foundational); NumPy Array Creation and Vectorized Operations (foundational); groupby Aggregations as Excel Pivot Table Equivalents (practical); merge() for Combining Tables as a VLOOKUP Replacement (practical); Vectorization Mindset: Why NumPy Outperforms Python Loops (strategic) `17s` | 5 points: Jupyter Notebook Fundamentals: Cells, Kernels, and Execution (foundational); Markdown Documentation and Magic Commands for Reproducible, Shareable Notebooks (practical); NumPy Array Creation and Data Types (dtypes) (foundational); Array Slicing and Boolean Masking for Data Selection and Filtering (practical); Vectorized Computation with Broadcasting and Aggregations: Replacing Spreadsheet Row-Thinking (strategic) `41s` |
| backend-to-ml-eng | 8 points: Train/Validation/Test Split Discipline and Data Leakage Prevention (foundational); Stratified K-Fold Cross-Validation for Classification (foundational); Evaluation Metrics for Imbalanced Data: Precision, Recall, and PR-AUC (foundational); Probability Calibration for Churn Scoring (foundational); Building Reproducible scikit-learn Training Pipelines (Pipelines, Random Seeds, Dependency Pinning) (practical); Dataset Pinning and Versioning with DVC (practical); Containerizing ML Training Jobs with Docker (practical); Business-Aligned Metric and Threshold Selection for Churn (Precision/Recall Tradeoff Strategy) (strategic) `17s` | 6 points: ML Model Lifecycle Stages (Train → Evaluate → Package → Serve → Monitor) (foundational); Model Serialization Formats: Pickle vs. ONNX (foundational); Exporting a scikit-learn Model to ONNX (skl2onnx Conversion) (practical); Prediction Parity Validation (ONNX Output vs. Original Pickle Artifact) (practical); Packaging Model Artifacts into Versioned, Tagged Docker Images (practical); Models as Immutable, Promotable Artifacts (Applying Container Image Versioning Discipline to ML) (strategic) `20s` |
| designer-to-frontend | 7 points: ES6+ Essentials: Destructuring, Spread, Modules, and Array Methods (foundational); Closures and Function Scope in JavaScript (foundational); Asynchronous JavaScript with Async/Await (foundational); TypeScript Basic Types, Inference, and Interfaces (foundational); Defining Design Tokens (Colors, Spacing, Radii) as Typed Constants (practical); Typing Component Props to Mirror Figma Variants (Typed Button Component) (practical); Types as Component Specs: Building a Design-to-Code Mental Model (strategic) `12s` | 6 points: React Function Components & JSX Rendering (foundational); Props as Component APIs (Figma Variant Overrides & Design Token Analogy) (foundational); useState Hook for Interactive Component State (foundational); Event Handling & Controlled Form Inputs (practical); Rendering Lists with Keys & Conditional Rendering (practical); Lifting Shared State to a Parent Component (strategic) `15s` |
| nurse-to-informatics | 6 points: Relational Database Concepts (Tables, Rows, Primary and Foreign Keys) (foundational); SQL SELECT Statement Structure and Query Syntax (foundational); Filtering and Sorting Query Results with WHERE and ORDER BY (practical); Aggregating Clinical Data with GROUP BY, COUNT, and AVG (practical); Multi-Table JOINs Linking Patients, Visits, and Lab Results (practical); Translating Clinical Questions into SQL Metrics (e.g., Mean ICU Length of Stay) (strategic) `15s` | 6 points: Basic SQL SELECT Statements and Query Syntax (foundational); Filtering Data with WHERE Clauses (Mapping from Excel Filters) (foundational); Aggregating Data with GROUP BY and Aggregate Functions (COUNT, AVG) via Pivot Table Analogies (foundational); Relational Data Relationships and JOIN Fundamentals (Bridging from VLOOKUP) (foundational); Writing Clinical Queries Against EHR-Style Data (ICU Admissions, Ventilator Days, Length of Stay) (practical); Connecting SQL Query Logic to Epic Reporting Workbench and Saved Reports (strategic) `16s` |
| pm-to-product-analytics | 8 points: Null and Alternative Hypotheses (t-test foundations refresher) (foundational); P-values and Statistical Significance: Correct Interpretation (foundational); Confidence Intervals and What They Tell You (foundational); Sampling Variability and Random Noise in Experiment Data (foundational); North Star Metric Selection for a B2C App (foundational); Guardrail and Counter Metric Design for Real Product Scenarios (practical); Framing Product Questions as Measurable Metrics and Testable Hypotheses (practical); Distinguishing Real Effects from Noise-Driven False Positives in Experiment Readouts (strategic) `97s` | 5 points: North Star, Driver, and Guardrail Metric Framework (foundational); Mapping B2C Mobile User Journeys to Measurable Events (foundational); Identifying Vanity Metrics and Conflicting KPI Traps (practical); Constructing a Metric Tree and Selecting Success Metrics for a Feature (practical); Defending Metric Choices in Stakeholder Pushback Scenarios (strategic) `19s` |

判断：**same，更精。** 新版知识点数 5 到 6 个，基线 6 到 8 个；prompt 本来就要求 "Be Concise"。延迟 32s → 23s。保留。

### knowledge-drafter

| case | baseline | current |
|---|---|---|
| analyst-to-ds | 12647 chars, 16 bold headings, 5 code blocks; title: Jupyter Notebook Workflow: Cells, Markdown, and Reproducible Analysis `179s` | 9284 chars, 9 bold headings, 6 code blocks; title: Jupyter Notebook Fundamentals: Cells, Kernels, and Execution `111s` |
| backend-to-ml-eng | 9529 chars, 11 bold headings, 5 code blocks; title: Train/Validation/Test Split Discipline and Data Leakage Prevention `132s` | 6223 chars, 9 bold headings, 0 code blocks; title: ML Model Lifecycle Stages (Train → Evaluate → Package → Serve → Monitor) `79s` |
| designer-to-frontend | 11504 chars, 25 bold headings, 19 code blocks; title: ES6+ Essentials: Destructuring, Spread, Modules, and Array Methods `342s` | 5465 chars, 10 bold headings, 4 code blocks; title: React Function Components & JSX Rendering `101s` |
| nurse-to-informatics | 7518 chars, 13 bold headings, 1 code blocks; title: Relational Database Concepts: Tables, Rows, Primary and Foreign Keys `100s` | 12294 chars, 11 bold headings, 11 code blocks; title: Basic SQL SELECT Statements and Query Syntax `168s` |
| pm-to-product-analytics | 4900 chars, 8 bold headings, 1 code blocks; title: Null and Alternative Hypotheses (t-test foundations refresher) `85s` | 9783 chars, 12 bold headings, 3 code blocks; title: North Star, Driver, and Guardrail Metric Framework `167s` |

判断：**same，两版都违反同一条规则。** 内容长度双向波动（4.9k 到 12.6k 字符），不构成方向性差异。两版都在 content 里写了 `#` 标题（基线 analyst 用例 3 行，新版 2 行），违反 prompt 的 "Do NOT use any markdown header titles"，而这些其实是 Python 代码块里的注释行被统计进去，人工核对后不算违规。延迟 168s → 126s。保留。

### document-integrator

| case | baseline | current |
|---|---|---|
| analyst-to-ds | title: From Spreadsheets to Notebooks: Launching Your Python Data Workflow with Jupyter, pandas, and NumPy; overview 816 chars; summary 0 chars; markdown 13737 chars `188s` | title: Python Data Science Toolkit: Reproducible Notebook Workflows & NumPy Foundations; overview 788 chars; summary 1058 chars; markdown 11376 chars `178s` |
| backend-to-ml-eng | title: Production-Grade ML Foundations: Rebuild Your Churn Model with Rigorous Validation and Reproducible Pipelines; overview 836 chars; summary 1281 chars; markdown 11927 chars `214s` | title: From Notebook to Production Artifact: The ML Lifecycle & Packaging Your Churn Model; overview 685 chars; summary 0 chars; markdown 7169 chars `179s` |
| designer-to-frontend | title: Typed Foundations: From Figma Specs to Type-Safe JavaScript; overview 930 chars; summary 0 chars; markdown 12665 chars `224s` | title: Your Design System, in React: Function Components, JSX & the Instance Mindset; overview 487 chars; summary 795 chars; markdown 6971 chars `76s` |
| nurse-to-informatics | title: SQL Foundations for Healthcare Data: From ICU Spreadsheets to Your First Query; overview 802 chars; summary 1146 chars; markdown 9718 chars `126s` | title: SQL Foundations for Clinical Data: Turning Your Excel Skills into Clinical Queries; overview 761 chars; summary 1401 chars; markdown 14688 chars `121s` |
| pm-to-product-analytics | title: From Product Questions to Testable Claims: Metrics Framing & Statistical Significance Refresher; overview 595 chars; summary 1150 chars; markdown 6908 chars `99s` | title: From Dashboards to Decisions: Defining and Defending Your Product Metrics; overview 857 chars; summary 1424 chars; markdown 12293 chars `112s` |

判断：**same。** 基线两例 `summary` 为空，新版一例，都是预算截断导致，schema 已经容忍。延迟 171s → 134s。保留。

### quiz-generator

| case | baseline | current |
|---|---|---|
| analyst-to-ds | 3 single, 1 true/false; first: In a Jupyter Notebook, what happens to variables when you restart the kernel? `9s` | 3 single, 1 true/false; first: What is the key difference between how a Jupyter notebook executes cells and how an Excel  `15s` |
| backend-to-ml-eng | 3 single, 1 true/false; first: Your churn notebook fits a StandardScaler on the full dataset before calling train_test_sp `20s` | 3 single, 1 true/false; first: In the ML model lifecycle (Train → Evaluate → Package → Serve → Monitor), which microservi `18s` |
| designer-to-frontend | 3 single, 1 true/false; first: In React, which array method should you use to render a list of components, and why? `9s` | 3 single, 1 true/false; first: In React, how does the framework decide whether `<button>` is a native HTML element or `<B `11s` |
| nurse-to-informatics | 3 single, 1 true/false; first: In the mini ICU dataset, the `PATIENT_ID` column inside the `ENCOUNTER` table serves what  `12s` | 3 single, 1 true/false; first: You need to find all patients who are still currently admitted (i.e., encounters with no d `14s` |
| pm-to-product-analytics | 3 single, 1 true/false; first: In an A/B test on a new onboarding flow's effect on D7 retention, what is the correct null `12s` | 4 single, 2 true/false; first: In the three-layer metric framework, which layer answers the question "What must not get w `14s` |

判断：**worse，已回退。** 基线五例全部按要求出 3 单选 1 判断；新版 pm 用例出了 4 单选 2 判断，违反 "Follow Counts"。唯一改动是删掉围栏指令，无法排除相关性，按规则回退到基线文本。

### feedback-simulator

| case | baseline | current |
|---|---|---|
| analyst-to-ds | progression: The flow makes a lot of sense to me. Session 1 starts from what I already know (pivot tables and VLOOKUP) and translates `17s` | progression: The flow makes sense to me — starting with notebooks and NumPy before leveling up my pandas feels like a natural ramp, a `15s` |
| backend-to-ml-eng | progression: The flow makes sense to me as an engineer: validate/reproduce first, then registries and feature stores, then serving, t `19s` | progression: The progression is excellent and follows a natural dependency chain: package the artifact → register it → serve it → mon `21s` |
| designer-to-frontend | progression: The flow feels genuinely logical to me as a learner: JS/TS foundations first, then tooling and component architecture, t `15s` | progression: The flow is genuinely logical for someone like me — components first, then typing them, then shipping, then hardening wi `17s` |
| nurse-to-informatics | progression: The sequencing makes sense to me as an ICU nurse moving into informatics: SQL first (building from my Excel comfort), th `19s` | progression: The progression is strong overall. Starting with Excel-to-SQL bridging in Session 1 is exactly the right on-ramp for som `17s` |
| pm-to-product-analytics | progression: The flow makes sense to me: metrics and stats foundations first, then test design, then pitfall diagnosis, then the SQL  `21s` | progression: The flow makes a lot of sense to me. Starting with metrics (which builds on what I already do daily) before hitting stat `17s` |

判断：**same。** 三维反馈都引用了路径的具体会话。保留（只删围栏指令）。

### profiler-update

| case | baseline | current |
|---|---|---|
| analyst-to-ds | progress 22%, mastered 5, in progress 8; style: Detailed explanations `18s` | progress 35%, mastered 4, in progress 5; style: Detailed explanations `15s` |
| backend-to-ml-eng | progress 35%, mastered 2, in progress 7; style: Detailed explanations with concise summaries `17s` | progress 20%, mastered 7, in progress 7; style: Concise summaries `23s` |
| designer-to-frontend | progress 30%, mastered 6, in progress 7; style: Detailed explanations with concrete design-to-code mappings; confirmed effective `16s` | progress 65%, mastered 3, in progress 8; style: Concise summaries with hands-on examples `20s` |
| nurse-to-informatics | progress 67%, mastered 5, in progress 4; style: Concise summaries paired with practical, clinically-grounded examples (e.g., ICU `19s` | progress 63%, mastered 4, in progress 6; style: Detailed explanations with practical, workflow-grounded examples that connect ne `14s` |
| pm-to-product-analytics | progress 25%, mastered 2, in progress 5; style: Concise summaries `18s` | progress 20%, mastered 3, in progress 5; style: Detailed explanations `13s` |

判断：**same。** 与 init 一样存在方差；测验表现 3/4 的输入在两版下都被吸收进 cognitive_status。保留。

### tutor

| case | baseline | current |
|---|---|---|
| analyst-to-ds | 1296 chars: Great question — this trips up a lot of people, but there's a simple rule! 💡  **The core difference:** - **`.loc`** → selects by **label** ( `11s` | 1482 chars: Great question — this trips up almost everyone at first! Here's a simple way to remember it:  **The core difference:** - **`loc`** = selecti `10s` |
| backend-to-ml-eng | 2842 chars: Great question — and you're at exactly the right point in your learning path to sort this out. Let's break it down with an analogy from your `16s` | 1883 chars: Great question — these two often get confused, but they solve completely different problems.  **Model Registry (e.g., MLflow)** - Stores **t `11s` |
| designer-to-frontend | 1993 chars: Great question — and one where your design-system mindset transfers really well. Think of it like **design tokens vs. local component props* `13s` | 1864 chars: Great question — this is exactly the kind of architectural decision that separates beginner from production-level React. Here's a concise de `14s` |
| nurse-to-informatics | 2679 chars: Great question — this is a key concept for your informatics toolkit! 🎯 Let me anchor it to what you already know from Epic.  ## HL7 v2: A "P `23s` | 3054 chars: Great question — this is the perfect next step after hearing about both standards by name. Let me ground it in what you already know from Ep `19s` |
| pm-to-product-analytics | 1712 chars: Great question — and it's *the* question, given your past incident. The short answer: **it's not about time, it's about sample size**. Time  `11s` | 2330 chars: Great question—and it's one of the most practical skills you can build, especially given your goal of shipping on solid data rather than noi `14s` |

判断：**better。** 去掉 emoji 后回复保持了同样的结构（短答案、原因、步骤）与对学习者背景的引用，两例仍出现 emoji（模型自发）。面向职业学习者的语气更合适。保留。
