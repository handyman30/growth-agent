# 🤖 Cursor Agent Guide - HandyLabs Growth Agent

## 🎯 Overview

Your HandyLabs Growth Agent now has **intelligent background agents** that automatically analyze your project and create GitHub PRs for improvements. This guide shows you how to use Cursor to work with these agents.

## 🚀 Quick Start

### 1. Start the Background Agents
```bash
# Start the scheduler (runs agents automatically)
npm run agent:scheduler

# Or run manual analysis
npm run agent:analyze

# Or run manual improvements
npm run agent:pr
```

### 2. Open in Cursor
- Open the project in Cursor
- The `.cursorrules` file will guide the AI
- Ask questions about improvements and features

## 🤖 Background Agents Explained

### 1. **Improvement Agent** (`src/agents/improvement-agent.ts`)
- **What it does**: Analyzes your project performance and generates improvement suggestions
- **When it runs**: Daily at 9 AM (or manually)
- **Output**: Saves suggestions to `data/improvement-suggestions.json`

### 2. **GitHub PR Agent** (`src/agents/github-pr-agent.ts`)
- **What it does**: Creates GitHub PRs for high-priority improvements
- **When it runs**: Weekly on Mondays at 10 AM (or manually)
- **Output**: Creates branches and PRs for you to review

### 3. **Agent Scheduler** (`src/agents/scheduler.ts`)
- **What it does**: Manages when agents run automatically
- **Schedules**:
  - Daily Analysis: 9 AM every day
  - Weekly Improvements: 10 AM every Monday
  - Monthly Review: 11 AM first day of month

## 💬 How to Use Cursor with Agents

### Ask About Improvements
```
/ What improvements did the agent suggest today?
/ How can I implement email sequence automation?
/ Why is my email success rate low?
/ Add Instagram DM automation to the project
/ Improve the dashboard UX for better lead management
```

### Review Agent Suggestions
```
/ Show me the latest improvement report
/ What are the high-priority improvements?
/ How can I increase email success rate from 1.4% to 50%?
/ Implement the email sequence automation feature
```

### Work with Generated PRs
```
/ Review the latest PR created by the agent
/ Improve the email sequence implementation
/ Add tests for the new Instagram DM feature
/ Refactor the improvement agent to be more intelligent
```

## 📊 Current Agent Analysis

Based on the latest analysis:

### 📈 Performance Metrics
- **Total Leads**: 147
- **Leads with Emails**: 2 (1.4% success rate)
- **System Health**: Healthy
- **Active Configurations**: 8

### 🎯 High-Priority Improvements
1. **Enhance Email Enrichment Strategy** (HIGH)
   - Add Apollo.io API integration
   - Better website email scraping
   - Email verification service

2. **Implement Email Sequence Automation** (HIGH)
   - Create sequence templates
   - Add scheduling logic
   - Response tracking

### 🔧 Medium-Priority Improvements
1. **Advanced Lead Filtering** (MEDIUM)
   - Search functionality
   - Bulk operations
   - Lead scoring

2. **Instagram DM Automation** (MEDIUM)
   - Instagram Graph API integration
   - DM templates and scheduling

## 🛠️ Agent Commands

### Manual Commands
```bash
# Run analysis only
npm run agent:analyze

# Create PRs for improvements
npm run agent:pr

# Run both analysis and improvements
npm run agent:manual

# Start automatic scheduler
npm run agent:scheduler
```

### Dashboard Integration
Visit `http://localhost:3000` and look for:
- Agent status and schedules
- Manual trigger buttons
- Improvement suggestions
- Performance metrics

## 🔍 Agent Output Files

### `data/improvement-suggestions.json`
Contains all improvement suggestions with:
- Priority levels
- Implementation details
- Files to modify
- Estimated impact

### `docs/improvements/`
Contains implementation documentation for each PR

### `reports/monthly-YYYY-MM.md`
Monthly improvement reports

## 🎯 Cursor Integration Examples

### Example 1: Implement Email Sequences
```
/ The agent suggested email sequence automation. Show me how to implement this step by step.
```

### Example 2: Improve Email Success Rate
```
/ My email success rate is only 1.4%. The agent suggested Apollo.io integration. Help me implement this.
```

### Example 3: Add Instagram DM Automation
```
/ The agent wants to add Instagram DM automation. Create the implementation for this feature.
```

### Example 4: Dashboard UX Improvements
```
/ The agent suggested advanced filtering. Improve the dashboard with search and bulk operations.
```

## 🔧 Customizing Agents

### Modify Agent Behavior
Edit `src/agents/improvement-agent.ts`:
- Change priority thresholds
- Add new improvement types
- Modify analysis criteria

### Adjust Schedules
Edit `src/agents/scheduler.ts`:
- Change cron schedules
- Add new agent types
- Modify trigger conditions

### Customize PR Creation
Edit `src/agents/github-pr-agent.ts`:
- Change PR templates
- Modify branch naming
- Add custom implementation logic

## 📈 Monitoring Agent Performance

### Check Agent Status
```bash
# View latest suggestions
cat data/improvement-suggestions.json | jq .

# Check agent logs
tail -f logs/agent.log

# View monthly reports
ls reports/
```

### Dashboard Monitoring
- Agent schedules and status
- Recent improvements
- Performance metrics
- Manual trigger buttons

## 🚀 Advanced Cursor Usage

### Ask for Code Reviews
```
/ Review the improvement agent code and suggest optimizations
/ The GitHub PR agent created a branch. Review the implementation
/ Suggest improvements to the agent scheduler
```

### Request New Features
```
/ Add LinkedIn scraping to the improvement agent suggestions
/ Create a new agent that analyzes email templates
/ Add performance monitoring to the agents
```

### Debug Issues
```
/ The agent is suggesting too many improvements. How can I tune it?
/ Why isn't the GitHub PR agent creating PRs?
/ The scheduler isn't running. Help me debug this
```

## 🎯 Best Practices

### 1. **Review Before Merging**
- Always review agent-generated PRs
- Test improvements thoroughly
- Monitor impact on metrics

### 2. **Tune Agent Parameters**
- Adjust priority thresholds
- Modify analysis frequency
- Customize improvement criteria

### 3. **Use Cursor for Implementation**
- Ask Cursor to implement suggestions
- Get code reviews from Cursor
- Use Cursor for debugging

### 4. **Monitor Performance**
- Track improvement success rates
- Monitor agent resource usage
- Review monthly reports

## 🔮 Future Enhancements

### Planned Agent Features
- [ ] AI-powered code generation
- [ ] Automatic testing integration
- [ ] Performance impact analysis
- [ ] Multi-repository support
- [ ] Slack/email notifications

### Cursor Integration Ideas
- [ ] Direct agent control from Cursor
- [ ] Real-time improvement suggestions
- [ ] Code generation from agent analysis
- [ ] Automated code reviews

## 🆘 Troubleshooting

### Common Issues
1. **Agent not running**: Check scheduler status
2. **No suggestions**: Run manual analysis
3. **PR creation fails**: Check GitHub CLI setup
4. **High resource usage**: Adjust analysis frequency

### Debug Commands
```bash
# Check agent status
npm run agent:analyze

# View logs
tail -f logs/agent.log

# Reset agent data
rm -rf data/improvement-suggestions.json
```

---

## 🎉 You're All Set!

Your HandyLabs Growth Agent now has intelligent background agents that will:
- ✅ Analyze your project daily
- ✅ Suggest improvements automatically
- ✅ Create GitHub PRs for you to review
- ✅ Work seamlessly with Cursor

**Start the scheduler and let the agents work their magic!** 🚀

---

*Need help? Ask Cursor: "How do I customize the improvement agent?"* 