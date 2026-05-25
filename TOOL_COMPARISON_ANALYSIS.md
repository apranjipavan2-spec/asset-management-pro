# Comparative Analysis: sigmap vs graphify vs Understand-Anything vs CodeGraph

**Project Context**: Kalike Asset Management  
**Codebase**: Vanilla JS (35 pages) + Express (1000+ line server.js) + better-sqlite3  
**Team**: Solo developer  
**Current State**: No TypeScript/tests, hand-rolled router  

---

## FEATURE COMPARISON MATRIX

| Feature | sigmap | graphify | Understand-Anything | CodeGraph |
|---------|--------|----------|-------------------|-----------|
| **Primary Purpose** | MCP code context server | Knowledge graphs + visualization | Interactive knowledge graphs | Code indexing for agents |
| **Architecture** | MCP protocol | Graph visualization engine | Multi-agent pipeline (LLM + tree-sitter) | SQLite FTS5 + tree-sitter |
| **Output Format** | Context for Claude | JSON graphs (visual + data) | JSON graphs + interactive UI | SQLite database |
| **Setup Complexity** | 🟢 Registered auto | 🟢 Already available | 🟡 Install + run analysis | 🟡 `codegraph init` once |
| **LLM Integration** | ✅ Native MCP | ✅ Via graphify | ✅ Built-in (multi-agent) | ✅ Via MCP |
| **Update Frequency** | On-demand via MCP | Manual runs | Incremental (tree-sitter fingerprints) | Auto-sync (file watchers) |
| **Visualization UI** | ❌ None | ✅ Interactive dashboard | ✅ Interactive + persona-adaptive | ❌ CLI only |
| **Performance (Search)** | Per-file reads | Graph queries | Semantic + graph search | 57% fewer tokens vs grep |
| **Framework Detection** | ❌ Basic | ❌ No | ❌ No | ✅ 14 frameworks (including Express) |
| **Route Detection** | ❌ No | ❌ No | ❌ No | ✅ Express routes → handlers |
| **Cross-file Links** | ✅ Via context | ✅ Node relationships | ✅ Rich (imports, calls, domains) | ✅ Calls, imports, inheritance |
| **Scalability** | Small-medium | Medium | Medium-large | Large (designed for 10k+ files) |
| **Cost Impact** | None (local) | None (local) | LLM API calls (Claude/OpenAI) | None (100% local) |
| **Memory Footprint** | 🟢 Low | 🟡 Medium | 🔴 High (LLM inference) | 🟡 Medium (SQLite DB) |
| **Learning Curve** | 🟢 None (auto-registered) | 🟡 Learn graph structure | 🔴 High (multi-agent concepts) | 🟡 Moderate (SQL queries) |

---

## DETAILED COMPARISON

### 1. **sigmap** (Currently Registered ✅)

**What It Does**:
- MCP server providing code context snapshots to Claude Code
- Returns file contents, directory structure, symbol definitions
- Operates on-demand when Claude requests context

**Strengths**:
- ✅ Already integrated (zero setup)
- ✅ Low latency (direct file reads)
- ✅ Lightweight (no indexing overhead)
- ✅ Perfect for real-time questions while coding

**Weaknesses**:
- ❌ No pre-computed relationships (every query re-scans)
- ❌ No visualization or UI
- ❌ Doesn't detect framework patterns (Express routes)
- ❌ Not optimized for "find all callers" or impact analysis

**Best For**: Quick context grabs during active development

**Kalike Fit**: ⭐⭐ Baseline acceptable; minimal friction

---

### 2. **graphify** (Currently Available ✅)

**What It Does**:
- Creates JSON knowledge graphs from code
- Generates interactive visualization dashboard
- Clusters code into communities
- Detects anomalies and code smells

**Strengths**:
- ✅ Already available (run `graphify`)
- ✅ Beautiful interactive UI for exploration
- ✅ Community detection (finds cohesion)
- ✅ Outputs shareable JSON for version control

**Weaknesses**:
- ❌ Requires manual re-runs (not incremental)
- ❌ No LLM semantic analysis (purely structural)
- ❌ Slower for large codebases
- ❌ No framework-aware routing detection
- ⚠️ Becomes stale as code changes

**Best For**: Architecture visualization and static analysis

**Kalike Fit**: ⭐⭐⭐ Useful for documentation, structure understanding

---

### 3. **Understand-Anything** (New Tool)

**What It Does**:
- Hybrid tree-sitter (structural) + LLM (semantic) analysis
- Creates interactive knowledge graphs with AI-generated summaries
- Auto-generates guided dependency-ordered tours
- Supports domain/business-logic mapping

**Strengths**:
- ✅ Semantic understanding (WHY, not just WHAT)
- ✅ Auto-generates onboarding tours
- ✅ LLM summaries of functions, modules
- ✅ Business domain extraction (perfect for institutional asset system)
- ✅ Incremental updates (fingerprint-based)
- ✅ Persona-adaptive UI (junior dev vs PMs)

**Weaknesses**:
- ❌ Requires LLM API calls (Claude/OpenAI) — **ongoing costs**
- ❌ ~5-15 min initial analysis (slower than CodeGraph)
- ❌ Parallel processing can hit rate limits
- ⚠️ GraphQL-like complexity for querying
- ⚠️ Not designed for agent integration (more for human UI)

**Best For**: Onboarding documentation, business logic understanding

**Kalike Fit**: ⭐⭐⭐⭐ Would help document institutional domain (asset lifecycle, grants, depreciation)

---

### 4. **CodeGraph** (New Tool)

**What It Does**:
- SQLite-indexed code knowledge graph
- Tree-sitter AST parsing + FTS5 full-text search
- MCP integration for Claude Code agents
- Auto-sync via native file watchers
- Framework-aware route detection (Express, Django, etc.)

**Strengths**:
- ✅ 100% local, no external APIs
- ✅ 57% fewer tokens, 71% fewer tool calls vs grep
- ✅ Auto-sync (stays current as you code)
- ✅ Express route detection (links `/api/users` → handler)
- ✅ MCP-native (direct agent integration)
- ✅ Designed for large codebases (10k+ files)
- ✅ One-time setup (`codegraph init`)

**Weaknesses**:
- ❌ SQLite DB must be rebuilt on major codebase changes
- ❌ No visualization UI (CLI-focused)
- ❌ Not designed for human exploration (graphs/tours)
- ⚠️ Overkill for small projects (150 files) — native grep is faster
- ⚠️ Relatively new (less community feedback)

**Best For**: Agent-assisted code exploration, large codebases

**Kalike Fit**: ⭐⭐⭐ Perfect for Claude Code agent assistance (you're a solo dev, this is your co-pilot)

---

## KALIKE PROJECT NEEDS ANALYSIS

### Current Pain Points (Estimated)
1. **Finding where API fields are used** — Manual grep  
   → Solved by: CodeGraph (call graph), Understand-Anything (graph)

2. **Understanding data flow (e.g., asset → transfer → depreciation)** — Read code  
   → Solved by: Understand-Anything (domain mapping), CodeGraph (call chains)

3. **Impact analysis (if I change users table, what breaks?)** — Manual tracing  
   → Solved by: CodeGraph (57% fewer tokens = faster answers), graphify (visualization)

4. **Onboarding new team members** — Read 35 pages + understand business logic  
   → Solved by: Understand-Anything (guided tours + domain mapping)

5. **Claude Code assistance during development** — Context via grep  
   → Solved by: CodeGraph (57% fewer tokens, 71% fewer tool calls)

---

## RECOMMENDATION MATRIX

### Scenario A: "I'm building alone, want Claude to help code faster"
**→ CodeGraph ✅ (best ROI)**
- 71% fewer tool calls (faster Claude responses)
- 100% local (no API costs)
- Express route detection (directly maps `/api/users/:id/password` → your endpoint)
- Auto-sync keeps index fresh

**Setup**: `npm install -g codegraph && codegraph init`  
**Cost**: $0  
**Time**: 5 min setup + 2 min indexing  
**Payoff**: Every Claude Code interaction becomes cheaper and faster  

---

### Scenario B: "I want beautiful architecture visualization + documentation"
**→ graphify ✅ (already have it)**
- Interactive dashboard (understanding code structure)
- Community detection (find coupling)
- Shareable JSON (commit to repo)
- No extra setup (already available)

**Setup**: Already done  
**Cost**: $0  
**Time**: Run `graphify` when you need it  
**Payoff**: Clear picture of code structure  

---

### Scenario C: "I need to onboard a team member or document business logic"
**→ Understand-Anything ✅ (best for humans)**
- LLM-generated function summaries
- Auto-generated dependency-ordered tours (new dev reads tour, understands flow)
- Domain extraction (Kalike's asset lifecycle concept)
- Persona-adaptive UI (CEO-level summaries vs dev detail)

**Setup**: Install + run analysis (10-15 min)  
**Cost**: ~$1-5 per analysis (Claude API calls)  
**Time**: 15 min initial, 5 min for updates  
**Payoff**: Institutional knowledge captured; onboarding friction reduced  

---

### Scenario D: "I want everything (best of all)"
**→ CodeGraph (primary) + Understand-Anything (secondary)**
- CodeGraph: Daily driver for Claude Code assistance
- Understand-Anything: Monthly documentation refresh (when major features land)

**Combined Cost**: Understand-Anything ~$5-10/month, CodeGraph $0  
**Combined Setup**: 20 min  
**Combined Payoff**: Fastest development + best documentation  

---

## RECOMMENDATION FOR KALIKE

### Immediate Action (Week 1)
✅ **Install CodeGraph** (5 min setup, unlimited benefit)
```bash
npm install -g codegraph
cd /path/to/Kalike/Asset
codegraph init
```

**Why**: 
- Integrates with Claude Code (you're already using it)
- 71% fewer tool calls = faster responses when you ask Claude questions
- Express framework detection = routes automatically linked to handlers
- Zero ongoing cost
- 100% local (no API keys, no privacy concerns)

---

### Optional Enhancement (Month 1+)
⭐ **Run Understand-Anything quarterly** (when major features ship)
```bash
# Initial setup
npm install -g understand-anything
cd /path/to/Kalike/Asset
understand-anything init

# Generates interactive dashboard + JSON for sharing
```

**Why**:
- When you plan to onboard someone (or want documentation)
- Extracts institutional concepts (asset lifecycle, depreciation rules, manager visibility)
- Creates guided tours (new dev can follow instead of random exploration)
- Costs ~$1-5 per run (pay only when you need it)

---

### Keep Using
✅ **graphify** (already available)
- Run when you want to visualize architecture
- No additional cost or setup

✅ **sigmap** (already registered)
- Your baseline context during development
- Works automatically

---

## DECISION SUMMARY

| Tool | Install? | Priority | Reason |
|------|----------|----------|--------|
| **sigmap** | Keep | N/A | Already active baseline |
| **graphify** | Keep | N/A | Already available, run as-needed |
| **CodeGraph** | ✅ YES | 🔴 High | 71% fewer tool calls; every Claude interaction faster |
| **Understand-Anything** | ⭐ Optional | 🟡 Medium | Install if/when you need documentation or onboarding |

---

## COST-BENEFIT ANALYSIS

### CodeGraph
- **Setup Cost**: 5 min
- **Monthly Cost**: $0
- **Benefit per interaction**: 71% fewer tool calls (faster Claude, fewer API calls to you)
- **ROI**: ∞ (negative cost; makes your existing tools cheaper)

### Understand-Anything
- **Setup Cost**: 10 min
- **Per-run Cost**: $1-5 (Claude API)
- **Frequency**: Quarterly (4x/year) = ~$4-20/year
- **Benefit**: Institutional knowledge captured, onboarding docs, architectural tours
- **ROI**: High if you ever onboard someone or document for compliance

### graphify
- **Setup Cost**: $0 (already done)
- **Monthly Cost**: $0
- **Benefit**: Architecture visualization, community detection
- **ROI**: Medium (useful for understanding, not critical for daily development)

### sigmap
- **Setup Cost**: $0 (already registered)
- **Monthly Cost**: $0
- **Benefit**: Baseline context for Claude
- **ROI**: Already incorporated

---

## FINAL RECOMMENDATION

### **Install CodeGraph Now** ✅
Highest impact, zero cost, measurable improvement to Claude Code productivity.

### **Keep graphify** ✅
Run as-needed for architecture understanding; already available.

### **Consider Understand-Anything Later** ⭐
Add when you:
- Need to document institutional knowledge (asset depreciation formulas, grant rules)
- Plan to onboard a team member
- Want to create a knowledge base for auditors/compliance

### **Keep sigmap Active** ✅
Baseline tool; already working in background.

---

## IMPLEMENTATION ROADMAP

**This Week**:
```bash
npm install -g codegraph
codegraph init
# Now when you ask Claude "Where is the password endpoint used?", 
# Claude will get 71% fewer distractions and answer in 1/3 the API calls
```

**This Quarter**:
```bash
npm install -g understand-anything
understand-anything init
# Generates interactive documentation + tours
# Commit to repo for team reference
```

**Ongoing**:
```bash
graphify  # Run whenever you want architecture visualization
codegraph status  # Verify index is current (auto-syncs)
```

---

## CONCLUSION

**You don't need all four.** You need:

1. **CodeGraph** (install now) — Makes Claude Code 71% more efficient
2. **graphify** (already have) — Use for architecture visualization
3. **Understand-Anything** (install later if needed) — Documentation/onboarding
4. **sigmap** (already active) — Baseline context

This stack evolves with your project:
- Solo dev building fast? CodeGraph is enough.
- Team of 2-3? Add Understand-Anything for docs.
- Large team needing compliance? Full stack (all 4).
