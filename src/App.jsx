

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const CATS = [
  { id:"intellectual", label:"Intellectual", icon:"🧠", color:"#4f9cf9", light:"rgba(79,156,249,0.12)" },
  { id:"social",       label:"Social",       icon:"🤝", color:"#34c98a", light:"rgba(52,201,138,0.12)" },
  { id:"physical",     label:"Physical",     icon:"💪", color:"#f97b4f", light:"rgba(249,123,79,0.12)"  },
  { id:"spiritual",    label:"Spiritual",    icon:"✨", color:"#c084fc", light:"rgba(192,132,252,0.12)" },
  { id:"financial",    label:"Financial",    icon:"💰", color:"#fbbf24", light:"rgba(251,191,36,0.12)"  },
];

const FREE_LIMITS = { indicators:4, yearlyGoals:2, weeklyTasks:14, financialGoals:1 };

// Every 15 minutes across 24 hours
const TIME_OPTIONS=(()=>{
  const opts=[];
  for(let h=0;h<24;h++){
    for(let m=0;m<60;m+=15){
      const hh=h===0?12:h>12?h-12:h;
      const ampm=h<12?"AM":"PM";
      opts.push(`${hh}:${String(m).padStart(2,"0")} ${ampm}`);
    }
  }
  return opts;
})();

const DEFAULT_TABS=[
  {id:"dashboard",   label:"Dashboard",       icon:"◈"},
  {id:"indicators",  label:"Key Indicators",  icon:"◎"},
  {id:"yearly",      label:"Life Goals",      icon:"◇"},
  {id:"financial",   label:"Financial",       icon:"💰"},
  {id:"weekly",      label:"Weekly & Calendar",icon:"▦"},
  {id:"reflection",  label:"Reflection",      icon:"◉"},
  {id:"achievements",label:"Achievements",    icon:"🏅"},
  {id:"social",      label:"Community",       icon:"👥"},
  {id:"profile",     label:"My Profile",      icon:"👤"},
  {id:"routines",    label:"Routines",        icon:"☀️",pro:true},
  {id:"aichat",      label:"AI Coach",        icon:"🤖",pro:true},
  {id:"analytics",   label:"Analytics",       icon:"📊",pro:true},
  {id:"inspiration", label:"Inspiration",     icon:"💡",pro:true},
  {id:"upgrade",     label:"Go Pro ★",        icon:"★",highlight:true},
];

const CUSTOM_EMOJIS = [
  {e:"❤️",label:"Love"},   {e:"🔥",label:"Fire"},   {e:"💪",label:"Strong"},
  {e:"🎉",label:"Congrats"},{e:"😮",label:"Wow"},     {e:"😂",label:"Funny"},
  {e:"👏",label:"Clap"},   {e:"🙏",label:"Grateful"},{e:"⭐",label:"Star"},
  {e:"🚀",label:"Rocket"},  {e:"💯",label:"100"},    {e:"🤩",label:"Amazing"},
];

const PLANS = [
  { id:"monthly",  label:"Monthly",  price:"$7.99",  period:"/mo",    save:"",          popular:false },
  { id:"yearly",   label:"Yearly",   price:"$59.99", period:"/yr",    save:"Save 37%",  popular:true  },
  { id:"lifetime", label:"Lifetime", price:"$149",   period:" once",  save:"Best Value",popular:false },
];

const QUOTES = [
  "Small daily improvements lead to stunning long-term results.",
  "The secret of getting ahead is getting started.",
  "Progress, not perfection, is the goal.",
  "Discipline is choosing what you want most over what you want now.",
  "One day or day one — you decide.",
  "Financial freedom is available to those who learn about it and work for it.",
  "A budget is telling your money where to go instead of wondering where it went.",
];

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [

  // ── GETTING STARTED (all bronze, super easy) ──────────────────────────────
  { id:"first_login",      tier:"bronze", icon:"🌱", title:"First Step",            desc:"Created your account and logged in for the first time.",           check:(d)=> true },
  { id:"first_ki",         tier:"bronze", icon:"📊", title:"Tracker",               desc:"Added your first Key Indicator.",                                  check:(d)=> d.kis.length >= 1 },
  { id:"first_goal",       tier:"bronze", icon:"🎯", title:"Dreamer",               desc:"Set your first yearly life goal.",                                 check:(d)=> d.yearlyGoals.length >= 1 },
  { id:"first_task",       tier:"bronze", icon:"✅", title:"Getting Things Done",   desc:"Added your first task to your weekly plan.",                       check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).length>0) },
  { id:"first_reflection", tier:"bronze", icon:"🪞", title:"Self-Aware",            desc:"Completed your first weekly reflection.",                          check:(d)=> (d.reflections||[]).length >= 1 },
  { id:"first_fin_goal",   tier:"bronze", icon:"💵", title:"Money Minded",          desc:"Created your first financial goal.",                               check:(d)=> (d.financialGoals||[]).length >= 1 },
  { id:"first_milestone",  tier:"bronze", icon:"🪜", title:"Step by Step",          desc:"Added a milestone to one of your yearly goals.",                   check:(d)=> d.yearlyGoals.some(g=>(g.steps||[]).length>=1) },
  { id:"first_deposit",    tier:"bronze", icon:"🪙", title:"First Deposit",         desc:"Made your first deposit toward a financial goal.",                 check:(d)=> (d.financialGoals||[]).some(g=>(g.deposits||[]).length>=1) },
  { id:"first_day_notes",  tier:"bronze", icon:"📝", title:"Note Taker",            desc:"Wrote notes in the day notes section.",                            check:(d)=> DAYS.some(day=>(d.weekDays[day]?.notes||"").length>5) },
  { id:"first_week_step",  tier:"bronze", icon:"👟", title:"This Week's Move",      desc:"Set a 'this week's step' on one of your yearly goals.",            check:(d)=> d.yearlyGoals.some(g=>(g.weekSteps||"").length>0) },
  { id:"five_tasks",       tier:"bronze", icon:"📋", title:"To-Do Warrior",         desc:"Added 5 tasks total across your weekly plan.",                     check:(d)=> DAYS.reduce((a,day)=>a+(d.weekDays[day]?.tasks||[]).length,0)>=5 },
  { id:"three_kis",        tier:"bronze", icon:"📈", title:"Data Driven",           desc:"Created 3 or more Key Indicators.",                                check:(d)=> d.kis.length>=3 },
  { id:"two_goals",        tier:"bronze", icon:"🏁", title:"Goal Setter",           desc:"Set 2 or more yearly goals.",                                      check:(d)=> d.yearlyGoals.length>=2 },
  { id:"two_fin_goals",    tier:"bronze", icon:"🏷️", title:"Budget Planner",        desc:"Created 2 financial goals.",                                       check:(d)=> (d.financialGoals||[]).length>=2 },
  { id:"full_week_planned",tier:"bronze", icon:"🗓️", title:"Planner Mode",          desc:"Added at least one task to every day of the week.",                check:(d)=> DAYS.every(day=>(d.weekDays[day]?.tasks||[]).length>=1) },
  { id:"complete_task",    tier:"bronze", icon:"☑️", title:"Done!",                 desc:"Marked your first task as complete.",                              check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).some(t=>t.done)) },
  { id:"goal_10",          tier:"bronze", icon:"🌿", title:"Off the Starting Line", desc:"Reached 10% on any yearly goal.",                                  check:(d)=> d.yearlyGoals.some(g=>g.progress>=10) },

  // ── KEY INDICATORS ────────────────────────────────────────────────────────
  { id:"ki_log_day",       tier:"bronze", icon:"📅", title:"Daily Logger",          desc:"Logged a Key Indicator for the first time.",                       check:(d)=> d.kis.some(k=>Object.values(k.dailyLogs||{}).some(v=>v>0)) },
  { id:"ki_full_week",     tier:"bronze", icon:"🗒️", title:"Full Coverage",         desc:"Logged at least one KI every day of the week.",                    check:(d)=> d.kis.some(k=>DAYS.every(day=>(k.dailyLogs[day]||0)>0)) },
  { id:"ki_hit_goal",      tier:"bronze", icon:"🎯", title:"Goal Met!",             desc:"Hit the weekly goal on any single Key Indicator.",                 check:(d)=> d.kis.some(k=>Object.values(k.dailyLogs||{}).reduce((a,b)=>a+(parseFloat(b)||0),0)>=k.weeklyGoal) },
  { id:"ki_5_indicators",  tier:"silver", icon:"🧩", title:"Multi-Tracker",         desc:"Created 5 or more Key Indicators.",                                check:(d)=> d.kis.length>=5 },
  { id:"ki_all_met",       tier:"silver", icon:"✨", title:"All Systems Go",        desc:"Hit the weekly goal on ALL your Key Indicators in one week.",      check:(d)=> d.kis.length>0&&d.kis.every(k=>Object.values(k.dailyLogs||{}).reduce((a,b)=>a+(parseFloat(b)||0),0)>=k.weeklyGoal) },
  { id:"ki_week_50",       tier:"silver", icon:"🔥", title:"On Fire",               desc:"Hit 50%+ across all Key Indicators in a week.",                    check:(d,s)=> (s.kiWeeksOver50||0)>=1 },
  { id:"ki_week_80",       tier:"gold",   icon:"⚡", title:"High Performer",        desc:"Hit 80%+ across all Key Indicators in a week.",                    check:(d,s)=> (s.kiWeeksOver80||0)>=1 },
  { id:"ki_perfect",       tier:"platinum",icon:"💎",title:"Perfect Week",          desc:"Hit 100% on every single Key Indicator in one week.",              check:(d,s)=> (s.kiPerfectWeeks||0)>=1 },
  { id:"ki_2streak",       tier:"bronze", icon:"🔁", title:"Consistent",            desc:"Hit 70%+ on KIs two weeks in a row.",                              check:(d,s)=> (s.kiStreak||0)>=2 },
  { id:"ki_3streak",       tier:"silver", icon:"🌊", title:"In The Flow",           desc:"Hit 70%+ on KIs three weeks in a row.",                            check:(d,s)=> (s.kiStreak||0)>=3 },
  { id:"ki_5streak",       tier:"silver", icon:"🏄", title:"Riding the Wave",       desc:"Five weeks in a row above 70%.",                                   check:(d,s)=> (s.kiStreak||0)>=5 },
  { id:"ki_8streak",       tier:"gold",   icon:"🏆", title:"Unstoppable",           desc:"Eight weeks in a row above 70%.",                                  check:(d,s)=> (s.kiStreak||0)>=8 },
  { id:"ki_12streak",      tier:"platinum",icon:"⚜️",title:"Iron Discipline",       desc:"Twelve weeks in a row above 70% — a full quarter.",                check:(d,s)=> (s.kiStreak||0)>=12 },

  // ── GOALS ─────────────────────────────────────────────────────────────────
  { id:"goal_25",          tier:"bronze", icon:"🌾", title:"Making Progress",       desc:"Reached 25% on any yearly goal.",                                  check:(d)=> d.yearlyGoals.some(g=>g.progress>=25) },
  { id:"goal_50",          tier:"silver", icon:"🌳", title:"Halfway There",         desc:"Reached 50% on any yearly goal.",                                  check:(d)=> d.yearlyGoals.some(g=>g.progress>=50) },
  { id:"goal_75",          tier:"silver", icon:"🏔️", title:"Almost There",          desc:"Reached 75% on any yearly goal.",                                  check:(d)=> d.yearlyGoals.some(g=>g.progress>=75) },
  { id:"goal_100",         tier:"gold",   icon:"🏅", title:"Goal Crusher",          desc:"Completed a yearly goal at 100%.",                                 check:(d)=> d.yearlyGoals.some(g=>g.progress>=100) },
  { id:"goals_2done",      tier:"gold",   icon:"🥇", title:"Double Down",           desc:"Completed 2 or more yearly goals.",                                check:(d)=> d.yearlyGoals.filter(g=>g.progress>=100).length>=2 },
  { id:"goals_3done",      tier:"platinum",icon:"👑",title:"Champion",              desc:"Completed 3 or more yearly goals.",                                check:(d)=> d.yearlyGoals.filter(g=>g.progress>=100).length>=3 },
  { id:"goals_5set",       tier:"silver", icon:"🗺️", title:"Visionary",             desc:"Set 5 or more yearly goals.",                                      check:(d)=> d.yearlyGoals.length>=5 },
  { id:"goals_10set",      tier:"gold",   icon:"🌐", title:"Big Picture Thinker",   desc:"Set 10 or more yearly goals.",                                     check:(d)=> d.yearlyGoals.length>=10 },
  { id:"milestone_5",      tier:"bronze", icon:"📌", title:"Milestone Maker",       desc:"Added 5 milestones across your goals.",                            check:(d)=> d.yearlyGoals.reduce((a,g)=>a+(g.steps||[]).length,0)>=5 },
  { id:"milestone_done",   tier:"silver", icon:"✔️", title:"Milestone Crusher",     desc:"Completed (checked off) your first milestone step.",               check:(d)=> d.yearlyGoals.some(g=>(g.steps||[]).some(s=>s.done)) },
  { id:"milestones_10done",tier:"gold",   icon:"🏗️", title:"Builder",               desc:"Completed 10 milestone steps across all goals.",                   check:(d)=> d.yearlyGoals.reduce((a,g)=>a+(g.steps||[]).filter(s=>s.done).length,0)>=10 },
  { id:"weekly_step_5",    tier:"silver", icon:"🚶", title:"Week by Week",          desc:"Set 'this week's step' on 5 different occasions.",                 check:(d,s)=> (s.weekStepsSet||0)>=5 },

  // ── INTELLECTUAL ──────────────────────────────────────────────────────────
  { id:"intel_ki",         tier:"bronze", icon:"🧠", title:"Knowledge Seeker",      desc:"Added an Intellectual Key Indicator.",                             check:(d)=> d.kis.some(k=>k.category==="intellectual") },
  { id:"intel_goal",       tier:"bronze", icon:"📚", title:"Lifelong Learner",      desc:"Created an Intellectual yearly goal.",                             check:(d)=> d.yearlyGoals.some(g=>g.category==="intellectual") },
  { id:"intel_task",       tier:"bronze", icon:"🖊️", title:"Brain Time",            desc:"Scheduled an Intellectual task in your weekly plan.",              check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).some(t=>t.category==="intellectual")) },
  { id:"intel_ki_streak",  tier:"silver", icon:"🔬", title:"Deep Thinker",          desc:"Hit your Intellectual KI goal 3 weeks running.",                   check:(d,s)=> (s.intelStreak||0)>=3 },

  // ── SOCIAL ────────────────────────────────────────────────────────────────
  { id:"social_ki",        tier:"bronze", icon:"🤝", title:"People Person",         desc:"Added a Social Key Indicator.",                                    check:(d)=> d.kis.some(k=>k.category==="social") },
  { id:"social_goal",      tier:"bronze", icon:"💬", title:"Community Builder",     desc:"Created a Social yearly goal.",                                    check:(d)=> d.yearlyGoals.some(g=>g.category==="social") },
  { id:"social_task",      tier:"bronze", icon:"🗣️", title:"Social Calendar",       desc:"Scheduled a Social task in your weekly plan.",                     check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).some(t=>t.category==="social")) },
  { id:"social_ki_streak", tier:"silver", icon:"🌟", title:"Connector",             desc:"Hit your Social KI goal 3 weeks running.",                         check:(d,s)=> (s.socialStreak||0)>=3 },

  // ── PHYSICAL ──────────────────────────────────────────────────────────────
  { id:"phys_ki",          tier:"bronze", icon:"💪", title:"Body in Motion",        desc:"Added a Physical Key Indicator.",                                  check:(d)=> d.kis.some(k=>k.category==="physical") },
  { id:"phys_goal",        tier:"bronze", icon:"🏃", title:"Fitness Focused",       desc:"Created a Physical yearly goal.",                                  check:(d)=> d.yearlyGoals.some(g=>g.category==="physical") },
  { id:"phys_task",        tier:"bronze", icon:"🎽", title:"Active Schedule",       desc:"Scheduled a Physical task in your weekly plan.",                   check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).some(t=>t.category==="physical")) },
  { id:"phys_ki_streak",   tier:"silver", icon:"🔥", title:"Athlete",               desc:"Hit your Physical KI goal 3 weeks running.",                       check:(d,s)=> (s.physStreak||0)>=3 },
  { id:"phys_weekend",     tier:"bronze", icon:"🌅", title:"Weekend Warrior",       desc:"Logged a physical activity on both Saturday and Sunday.",           check:(d)=> d.kis.some(k=>k.category==="physical"&&(k.dailyLogs["Saturday"]||0)>0&&(k.dailyLogs["Sunday"]||0)>0) },

  // ── SPIRITUAL ─────────────────────────────────────────────────────────────
  { id:"spirit_ki",        tier:"bronze", icon:"✨", title:"Inner Life",            desc:"Added a Spiritual Key Indicator.",                                 check:(d)=> d.kis.some(k=>k.category==="spiritual") },
  { id:"spirit_goal",      tier:"bronze", icon:"🕊️", title:"Soul Goals",            desc:"Created a Spiritual yearly goal.",                                 check:(d)=> d.yearlyGoals.some(g=>g.category==="spiritual") },
  { id:"spirit_task",      tier:"bronze", icon:"🙏", title:"Sacred Space",          desc:"Scheduled a Spiritual task in your weekly plan.",                  check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).some(t=>t.category==="spiritual")) },
  { id:"spirit_ki_streak", tier:"silver", icon:"🌙", title:"Devoted",               desc:"Hit your Spiritual KI goal 3 weeks running.",                      check:(d,s)=> (s.spiritStreak||0)>=3 },
  { id:"spirit_morning",   tier:"bronze", icon:"☀️", title:"Morning Ritual",        desc:"Scheduled a Spiritual task at 7 AM or earlier.",                   check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).some(t=>t.category==="spiritual"&&(t.time||"").includes("AM")&&parseInt(t.time)<=7)) },

  // ── FINANCIAL ─────────────────────────────────────────────────────────────
  { id:"fin_first_deposit",tier:"bronze", icon:"🪙", title:"Penny Saved",           desc:"Made your very first deposit toward any financial goal.",           check:(d)=> (d.financialGoals||[]).some(g=>(g.deposits||[]).length>=1) },
  { id:"fin_3deposits",    tier:"bronze", icon:"💰", title:"Saving Habit",          desc:"Made 3 deposits across your financial goals.",                     check:(d)=> (d.financialGoals||[]).reduce((a,g)=>a+(g.deposits||[]).length,0)>=3 },
  { id:"fin_10deposits",   tier:"silver", icon:"🏧", title:"Consistent Saver",      desc:"Made 10 deposits across your financial goals.",                    check:(d)=> (d.financialGoals||[]).reduce((a,g)=>a+(g.deposits||[]).length,0)>=10 },
  { id:"fin_save_100",     tier:"bronze", icon:"💵", title:"First Hundred",         desc:"Saved $100 toward any financial goal.",                            check:(d)=> (d.financialGoals||[]).some(g=>(g.saved||0)>=100) },
  { id:"fin_save_500",     tier:"bronze", icon:"💴", title:"Half a Grand",          desc:"Saved $500 toward any financial goal.",                            check:(d)=> (d.financialGoals||[]).some(g=>(g.saved||0)>=500) },
  { id:"fin_save_1k",      tier:"silver", icon:"💳", title:"Saver",                 desc:"Saved $1,000 toward any financial goal.",                          check:(d)=> (d.financialGoals||[]).some(g=>(g.saved||0)>=1000) },
  { id:"fin_save_5k",      tier:"silver", icon:"💶", title:"Five Figures Club",     desc:"Saved $5,000 toward any financial goal.",                          check:(d)=> (d.financialGoals||[]).some(g=>(g.saved||0)>=5000) },
  { id:"fin_save_10k",     tier:"gold",   icon:"🏦", title:"Wealth Builder",        desc:"Saved $10,000 toward any financial goal.",                         check:(d)=> (d.financialGoals||[]).some(g=>(g.saved||0)>=10000) },
  { id:"fin_goal_50pct",   tier:"bronze", icon:"📊", title:"Halfway Funded",        desc:"Reached 50% on any financial goal.",                               check:(d)=> (d.financialGoals||[]).some(g=>g.targetAmount>0&&(g.saved||0)/g.targetAmount>=0.5) },
  { id:"fin_goal_done",    tier:"gold",   icon:"🤑", title:"Paid In Full",          desc:"Fully funded a financial goal.",                                   check:(d)=> (d.financialGoals||[]).some(g=>g.targetAmount>0&&(g.saved||0)>=g.targetAmount) },
  { id:"fin_2done",        tier:"gold",   icon:"💯", title:"Double Funded",         desc:"Fully funded 2 financial goals.",                                  check:(d)=> (d.financialGoals||[]).filter(g=>g.targetAmount>0&&(g.saved||0)>=g.targetAmount).length>=2 },
  { id:"fin_3done",        tier:"platinum",icon:"💸",title:"Financially Free",      desc:"Fully funded 3 or more financial goals.",                          check:(d)=> (d.financialGoals||[]).filter(g=>g.targetAmount>0&&(g.saved||0)>=g.targetAmount).length>=3 },
  { id:"fin_5goals",       tier:"silver", icon:"📈", title:"Portfolio Builder",     desc:"Created 5 or more financial goals.",                               check:(d)=> (d.financialGoals||[]).length>=5 },
  { id:"fin_emergency",    tier:"silver", icon:"🛡️", title:"Safety Net",            desc:"Created an Emergency Fund financial goal.",                        check:(d)=> (d.financialGoals||[]).some(g=>g.category==="emergency") },
  { id:"fin_invest",       tier:"silver", icon:"📉", title:"Investor",              desc:"Created an Investment financial goal.",                             check:(d)=> (d.financialGoals||[]).some(g=>g.category==="investment") },
  { id:"fin_debt",         tier:"silver", icon:"✂️", title:"Debt Slayer",           desc:"Created a Debt Payoff financial goal.",                            check:(d)=> (d.financialGoals||[]).some(g=>g.category==="debt") },

  // ── REFLECTION ────────────────────────────────────────────────────────────
  { id:"reflect_2",        tier:"bronze", icon:"📓", title:"Getting Reflective",    desc:"Completed 2 weekly reflections.",                                  check:(d)=> (d.reflections||[]).length>=2 },
  { id:"reflect_5",        tier:"silver", icon:"📖", title:"Journaler",             desc:"Completed 5 weekly reflections.",                                  check:(d)=> (d.reflections||[]).length>=5 },
  { id:"reflect_10",       tier:"gold",   icon:"🧭", title:"The Examined Life",     desc:"Completed 10 weekly reflections.",                                 check:(d)=> (d.reflections||[]).length>=10 },
  { id:"reflect_20",       tier:"gold",   icon:"🦉", title:"Wise One",              desc:"Completed 20 weekly reflections — nearly half a year.",             check:(d)=> (d.reflections||[]).length>=20 },
  { id:"reflect_52",       tier:"platinum",icon:"📜",title:"A Full Year",           desc:"Completed a full year of weekly reflections (52 entries).",         check:(d)=> (d.reflections||[]).length>=52 },
  { id:"reflect_highrate", tier:"silver", icon:"😊", title:"Optimist",              desc:"Rated a week 9 or 10 out of 10.",                                  check:(d)=> (d.reflections||[]).some(r=>r.rating>=9) },
  { id:"reflect_comeback", tier:"silver", icon:"🔄", title:"Bounce Back",           desc:"Rated a week 7+ after a previous week rated 4 or lower.",          check:(d)=> { const r=d.reflections||[]; for(let i=1;i<r.length;i++){if(r[i].rating<=4&&r[i-1].rating>=7)return true;} return false; } },
  { id:"reflect_improve",  tier:"bronze", icon:"💡", title:"I've Got Ideas",        desc:"Filled in the 'What Could Be Better' section of a reflection.",    check:(d)=> (d.reflections||[]).some(r=>(r.improve||"").length>10) },
  { id:"reflect_commit",   tier:"bronze", icon:"🤲", title:"I Commit",              desc:"Wrote a next-week commitment in a reflection.",                    check:(d)=> (d.reflections||[]).some(r=>(r.commitment||"").length>5) },
  { id:"reflect_allcats",  tier:"gold",   icon:"🌸", title:"Whole Self",            desc:"Filled in all 5 category notes in a single reflection.",           check:(d)=> (d.reflections||[]).some(r=>CATS.every(c=>(r.catNotes||{})[c.id]?.length>0)) },

  // ── PLANNING HABITS ───────────────────────────────────────────────────────
  { id:"tasks_10done",     tier:"bronze", icon:"✔️", title:"Getting It Done",       desc:"Completed 10 tasks across any weeks.",                             check:(d)=> DAYS.reduce((a,day)=>a+(d.weekDays[day]?.tasks||[]).filter(t=>t.done).length,0)>=10 },
  { id:"tasks_25done",     tier:"silver", icon:"💼", title:"Productivity Pro",      desc:"Completed 25 tasks across any weeks.",                             check:(d)=> DAYS.reduce((a,day)=>a+(d.weekDays[day]?.tasks||[]).filter(t=>t.done).length,0)>=25 },
  { id:"tasks_50done",     tier:"gold",   icon:"🚀", title:"Task Machine",          desc:"Completed 50 tasks across any weeks.",                             check:(d)=> DAYS.reduce((a,day)=>a+(d.weekDays[day]?.tasks||[]).filter(t=>t.done).length,0)>=50 },
  { id:"day_complete",     tier:"bronze", icon:"🌞", title:"Perfect Day",           desc:"Completed all tasks on a single day.",                             check:(d)=> DAYS.some(day=>{ const ts=d.weekDays[day]?.tasks||[]; return ts.length>=2&&ts.every(t=>t.done); }) },
  { id:"all_cats_tasks",   tier:"silver", icon:"🎨", title:"Well-Rounded Week",     desc:"Scheduled tasks in all 5 life categories in one week.",            check:(d)=> CATS.every(c=>DAYS.some(day=>(d.weekDays[day]?.tasks||[]).some(t=>t.category===c.id))) },
  { id:"early_bird",       tier:"bronze", icon:"🐦", title:"Early Bird",            desc:"Scheduled a task at 6:00 AM or 7:00 AM.",                          check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).some(t=>(t.time||"").match(/^[67]:00 AM/))) },
  { id:"night_owl",        tier:"bronze", icon:"🦉", title:"Night Owl",             desc:"Scheduled a task at 8:00 PM or 9:00 PM.",                          check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).some(t=>(t.time||"").match(/^[89]:00 PM/))) },

  // ── CALENDAR ──────────────────────────────────────────────────────────────
  { id:"cal_sync",         tier:"silver", icon:"🗓️", title:"Synced Up",             desc:"Connected and synced with Google Calendar.",                       check:(d)=> d.calendarConnected===true },

  // ── ALL-AROUND / MASTERY ──────────────────────────────────────────────────
  { id:"all_cats_ki",      tier:"silver",  icon:"🧬", title:"Five Dimensions",       desc:"Have at least one KI in all 5 life categories.",                    check:(d)=> CATS.every(c=>d.kis.some(k=>k.category===c.id)) },
  { id:"all_cats_goals",   tier:"gold",    icon:"🌈", title:"Renaissance Person",    desc:"Have at least one yearly goal in all 5 life categories.",           check:(d)=> CATS.every(c=>d.yearlyGoals.some(g=>g.category===c.id)) },
  { id:"grand_slam",       tier:"platinum",icon:"🌟", title:"Life Architect",        desc:"Hit 100% on KIs, completed a goal, and wrote a reflection in one week.", check:(d,s)=> (s.grandSlam||0)>=1 },
  { id:"hundred_club",     tier:"platinum",icon:"💯", title:"100 Club",              desc:"Completed 100 tasks total across all weeks.",                       check:(d)=> DAYS.reduce((a,day)=>a+(d.weekDays[day]?.tasks||[]).filter(t=>t.done).length,0)>=100 },
  { id:"dedicated",        tier:"gold",    icon:"🎖️", title:"Dedicated",             desc:"Used the app for at least 4 weeks (4+ reflections).",               check:(d)=> (d.reflections||[]).length>=4 },
  { id:"overachiever",     tier:"platinum",icon:"⭐", title:"Overachiever",          desc:"Earned 25 or more medals.",                                         check:(d)=> (d.earnedAchievements||[]).length>=25 },
  { id:"medal_collector",  tier:"gold",    icon:"🗂️", title:"Medal Collector",       desc:"Earned 15 or more medals.",                                         check:(d)=> (d.earnedAchievements||[]).length>=15 },
  { id:"just_started",     tier:"bronze",  icon:"🎉", title:"Welcome!",              desc:"Earned your first 5 medals.",                                       check:(d)=> (d.earnedAchievements||[]).length>=5 },

  // ── EASY QUICK WINS (immediately achievable actions) ──────────────────────
  { id:"profile_complete", tier:"bronze",  icon:"👤", title:"All Set Up",            desc:"Have at least one KI, one goal, and one task all at the same time.", check:(d)=> d.kis.length>=1&&d.yearlyGoals.length>=1&&DAYS.some(day=>(d.weekDays[day]?.tasks||[]).length>0) },
  { id:"goal_described",   tier:"bronze",  icon:"✍️", title:"Why It Matters",        desc:"Added a description to any yearly goal.",                           check:(d)=> d.yearlyGoals.some(g=>(g.description||"").length>10) },
  { id:"fin_goal_noted",   tier:"bronze",  icon:"🗒️", title:"Money Memo",            desc:"Added notes to a financial goal.",                                  check:(d)=> (d.financialGoals||[]).some(g=>(g.notes||"").length>5) },
  { id:"fin_deadline",     tier:"bronze",  icon:"📆", title:"On a Deadline",         desc:"Set a target date on any financial goal.",                          check:(d)=> (d.financialGoals||[]).some(g=>(g.deadline||"").length>0) },
  { id:"goal_deadline",    tier:"bronze",  icon:"🗓️", title:"Race the Clock",        desc:"Set a target date on any yearly goal.",                             check:(d)=> d.yearlyGoals.some(g=>(g.target||"").length>0) },
  { id:"task_with_notes",  tier:"bronze",  icon:"📎", title:"Extra Detail",          desc:"Added notes to a weekly task.",                                     check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).some(t=>(t.notes||"").length>0)) },
  { id:"ten_tasks_planned",tier:"bronze",  icon:"🗃️", title:"Ten on the List",       desc:"Have 10 or more tasks planned across your week.",                   check:(d)=> DAYS.reduce((a,day)=>a+(d.weekDays[day]?.tasks||[]).length,0)>=10 },
  { id:"three_categories", tier:"bronze",  icon:"🎭", title:"Well-Rounded",          desc:"Have tasks in at least 3 different life categories.",               check:(d)=> new Set(DAYS.flatMap(day=>(d.weekDays[day]?.tasks||[]).map(t=>t.category))).size>=3 },
  { id:"five_milestones",  tier:"bronze",  icon:"🗺️", title:"Roadmap Ready",         desc:"Added 5 or more milestones to a single goal.",                      check:(d)=> d.yearlyGoals.some(g=>(g.steps||[]).length>=5) },
  { id:"reflect_wentwell", tier:"bronze",  icon:"🌟", title:"Count Your Wins",       desc:"Filled in 'What Went Well' in your first reflection.",              check:(d)=> (d.reflections||[]).some(r=>(r.wentWell||"").length>5) },
  { id:"monday_task",      tier:"bronze",  icon:"🌄", title:"Strong Start",          desc:"Added a task on Monday.",                                           check:(d)=> (d.weekDays["Monday"]?.tasks||[]).length>=1 },
  { id:"friday_task",      tier:"bronze",  icon:"🎊", title:"Finish Strong",         desc:"Added a task on Friday.",                                           check:(d)=> (d.weekDays["Friday"]?.tasks||[]).length>=1 },
  { id:"weekend_plan",     tier:"bronze",  icon:"⛺", title:"Weekend Planner",        desc:"Added tasks to both Saturday and Sunday.",                          check:(d)=> (d.weekDays["Saturday"]?.tasks||[]).length>=1&&(d.weekDays["Sunday"]?.tasks||[]).length>=1 },
  { id:"ki_goal_20",       tier:"bronze",  icon:"🔖", title:"Ambitious Tracker",     desc:"Set a weekly KI goal of 20 or more.",                               check:(d)=> d.kis.some(k=>k.weeklyGoal>=20) },
  { id:"two_reflections",  tier:"bronze",  icon:"🪴", title:"Checking In",           desc:"Saved 2 weekly reflections.",                                       check:(d)=> (d.reflections||[]).length>=2 },

  // ── PROGRESS MILESTONES ────────────────────────────────────────────────────
  { id:"fin_25pct",        tier:"bronze",  icon:"💹", title:"Building Momentum",     desc:"Reached 25% on any financial goal.",                                check:(d)=> (d.financialGoals||[]).some(g=>g.targetAmount>0&&(g.saved||0)/g.targetAmount>=0.25) },
  { id:"fin_75pct",        tier:"silver",  icon:"🏁", title:"Almost Funded",         desc:"Reached 75% on any financial goal.",                                check:(d)=> (d.financialGoals||[]).some(g=>g.targetAmount>0&&(g.saved||0)/g.targetAmount>=0.75) },
  { id:"fin_save_250",     tier:"bronze",  icon:"💰", title:"Getting Started",       desc:"Saved $250 toward any financial goal.",                             check:(d)=> (d.financialGoals||[]).some(g=>(g.saved||0)>=250) },
  { id:"fin_save_2500",    tier:"silver",  icon:"🏧", title:"Quarter Way to 10K",    desc:"Saved $2,500 across your financial goals.",                         check:(d)=> (d.financialGoals||[]).reduce((a,g)=>a+(g.saved||0),0)>=2500 },
  { id:"total_saved_1k",   tier:"silver",  icon:"🏦", title:"Thousand Dollar Club",  desc:"Saved $1,000 total across all financial goals combined.",           check:(d)=> (d.financialGoals||[]).reduce((a,g)=>a+(g.saved||0),0)>=1000 },
  { id:"goal_added_step",  tier:"bronze",  icon:"👣", title:"Next Action",           desc:"Added a 'this week's step' to a goal that's under 50%.",            check:(d)=> d.yearlyGoals.some(g=>g.progress<50&&(g.weekSteps||"").length>0) },
  { id:"three_done_tasks", tier:"bronze",  icon:"✅", title:"Triple Check",          desc:"Completed 3 tasks in a single day.",                                check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).filter(t=>t.done).length>=3) },
  { id:"five_done_tasks",  tier:"silver",  icon:"🌠", title:"Power Day",             desc:"Completed 5 tasks in a single day.",                                check:(d)=> DAYS.some(day=>(d.weekDays[day]?.tasks||[]).filter(t=>t.done).length>=5) },
  { id:"goals_half_done",  tier:"silver",  icon:"🌻", title:"Halfway Champion",      desc:"Have more than half of your yearly goals at 50%+.",                 check:(d)=> { const g=d.yearlyGoals; return g.length>=2&&g.filter(x=>x.progress>=50).length>g.length/2; } },

  // ── CONSISTENCY REWARDS ────────────────────────────────────────────────────
  { id:"reflect_3",        tier:"bronze",  icon:"📒", title:"Building the Habit",    desc:"Saved 3 weekly reflections.",                                       check:(d)=> (d.reflections||[]).length>=3 },
  { id:"tasks_5done",      tier:"bronze",  icon:"🥉", title:"Getting Rolling",       desc:"Completed 5 tasks total.",                                          check:(d)=> DAYS.reduce((a,day)=>a+(d.weekDays[day]?.tasks||[]).filter(t=>t.done).length,0)>=5 },
  { id:"ki_3logs",         tier:"bronze",  icon:"📉", title:"Data Collector",        desc:"Logged KI values on 3 different days.",                             check:(d)=> { let days=new Set(); d.kis.forEach(k=>Object.entries(k.dailyLogs||{}).forEach(([d,v])=>{if(v>0)days.add(d);})); return days.size>=3; } },
  { id:"ki_all_logged",    tier:"bronze",  icon:"📋", title:"Full Scorecard",        desc:"Logged a value for every KI you have at least once.",               check:(d)=> d.kis.length>0&&d.kis.every(k=>Object.values(k.dailyLogs||{}).some(v=>v>0)) },
  { id:"deposit_weekly",   tier:"silver",  icon:"📅", title:"Weekly Saver",          desc:"Made at least one deposit every week for 3 weeks (3+ deposits on different dates).", check:(d)=> { const dates=new Set((d.financialGoals||[]).flatMap(g=>(g.deposits||[]).map(dep=>dep.date))); return dates.size>=3; } },
  { id:"reflect_rate5",    tier:"bronze",  icon:"⭐", title:"Honest Reviewer",       desc:"Saved a reflection with any rating.",                               check:(d)=> (d.reflections||[]).length>=1 },
  { id:"two_ki_goals_met", tier:"silver",  icon:"🎯", title:"Double Target",         desc:"Hit the weekly goal on 2 Key Indicators in the same week.",         check:(d)=> d.kis.filter(k=>Object.values(k.dailyLogs||{}).reduce((a,b)=>a+(parseFloat(b)||0),0)>=k.weeklyGoal).length>=2 },
  { id:"three_ki_goals_met",tier:"silver", icon:"🔱", title:"Triple Target",         desc:"Hit the weekly goal on 3 Key Indicators in the same week.",         check:(d)=> d.kis.filter(k=>Object.values(k.dailyLogs||{}).reduce((a,b)=>a+(parseFloat(b)||0),0)>=k.weeklyGoal).length>=3 },

  // ── FUN / PERSONALITY ─────────────────────────────────────────────────────
  { id:"planner_fanatic",  tier:"silver",  icon:"🗂️", title:"Planner Fanatic",       desc:"Have 20 or more tasks planned across your week.",                   check:(d)=> DAYS.reduce((a,day)=>a+(d.weekDays[day]?.tasks||[]).length,0)>=20 },
  { id:"goal_rich",        tier:"gold",    icon:"💎", title:"Goal Rich",             desc:"Have 8 or more yearly goals created.",                              check:(d)=> d.yearlyGoals.length>=8 },
  { id:"ki_obsessed",      tier:"gold",    icon:"📡", title:"KI Obsessed",           desc:"Created 8 or more Key Indicators.",                                 check:(d)=> d.kis.length>=8 },
  { id:"notes_writer",     tier:"silver",  icon:"🖋️", title:"Wordsmith",             desc:"Have day notes on 5 or more days.",                                 check:(d)=> DAYS.filter(day=>(d.weekDays[day]?.notes||"").length>10).length>=5 },
  { id:"finance_diverse",  tier:"gold",    icon:"🧺", title:"Diversified",           desc:"Have financial goals in 4 different categories.",                   check:(d)=> new Set((d.financialGoals||[]).map(g=>g.category)).size>=4 },
  { id:"all_tasks_done_week",tier:"gold",  icon:"🎖️", title:"Zero Backlog",          desc:"Completed every single planned task for the week.",                 check:(d)=> { const all=DAYS.flatMap(day=>d.weekDays[day]?.tasks||[]); return all.length>=5&&all.every(t=>t.done); } },

  // ── EMERALD TIER — PRO & STREAKS ──────────────────────────────────────────
  { id:"pro_member",        tier:"emerald", icon:"★",  title:"Pro Member",            desc:"Upgraded to Ultimate Planner Pro. You're living it!",               check:(d,s,u)=> u?.isPro===true },
  { id:"login_streak_3",    tier:"bronze",  icon:"📆", title:"3-Day Streak",          desc:"Logged in 3 days in a row.",                                        check:(d,s)=> (s.loginStreak||0)>=3 },
  { id:"login_streak_7",    tier:"silver",  icon:"🗓️", title:"Week Warrior",          desc:"Logged in every day for a full week.",                              check:(d,s)=> (s.loginStreak||0)>=7 },
  { id:"login_streak_14",   tier:"gold",    icon:"🔥", title:"Two-Week Flame",        desc:"14 consecutive days of logging in.",                                check:(d,s)=> (s.loginStreak||0)>=14 },
  { id:"login_streak_30",   tier:"emerald", icon:"💚", title:"Monthly Devotion",      desc:"30 days in a row — an entire month of consistency!",                check:(d,s)=> (s.loginStreak||0)>=30 },
  { id:"login_streak_60",   tier:"emerald", icon:"🌿", title:"Two Months Strong",     desc:"60 consecutive login days. This is a lifestyle.",                   check:(d,s)=> (s.loginStreak||0)>=60 },
  { id:"login_streak_100",  tier:"emerald", icon:"💎", title:"Century Club",          desc:"100 days straight. Absolute dedication.",                           check:(d,s)=> (s.loginStreak||0)>=100 },
  { id:"login_streak_365",  tier:"emerald", icon:"🌳", title:"Year of Growth",        desc:"An entire year of daily logins. Legendary.",                        check:(d,s)=> (s.loginStreak||0)>=365 },
  { id:"pro_planner",       tier:"emerald", icon:"🗺️", title:"Pro Planner",           desc:"Used the Pro weekly planning wizard as a Pro member.",              check:(d,s,u)=> u?.isPro&&(s.proWizardUsed||0)>=1 },
  { id:"pro_ai_coach",      tier:"emerald", icon:"🤖", title:"AI-Coached",            desc:"Sent your first message to the AI Coach as a Pro member.",          check:(d,s,u)=> u?.isPro&&(d.aiCoachUsed||false) },
  { id:"pro_cal_sync",      tier:"emerald", icon:"🔗", title:"Calendar Synced",       desc:"Synced your plan to Google Calendar as a Pro member.",              check:(d,s,u)=> u?.isPro&&d.calendarConnected },
  { id:"milestone_gate_1",  tier:"silver",  icon:"🚪", title:"Gated Progress",        desc:"Completed a milestone that unlocked goal progress (Pro).",          check:(d)=> d.yearlyGoals.some(g=>g.milestonesRequired&&(g.steps||[]).some(s=>s.done)) },
  { id:"calorie_calc_used", tier:"bronze",  icon:"🥗", title:"Nutrition Navigator",   desc:"Used the calorie calculator on a Physical goal.",                   check:(d,s)=> (s.calorieCalcUsed||0)>=1 },
];

const TIER_COLORS = {
  bronze:   { bg:"rgba(180,100,40,0.15)",  border:"rgba(180,100,40,0.4)",  text:"#cd7f32", glow:"rgba(205,127,50,0.4)"  },
  silver:   { bg:"rgba(180,180,180,0.12)", border:"rgba(180,180,180,0.35)",text:"#c0c0c0", glow:"rgba(192,192,192,0.4)" },
  gold:     { bg:"rgba(245,158,11,0.15)",  border:"rgba(245,158,11,0.4)",  text:"#fbbf24", glow:"rgba(251,191,36,0.5)"  },
  platinum: { bg:"rgba(100,180,240,0.12)", border:"rgba(100,180,240,0.4)", text:"#67e8f9", glow:"rgba(103,232,249,0.5)" },
  emerald:  { bg:"rgba(16,185,129,0.14)",  border:"rgba(16,185,129,0.45)", text:"#10b981", glow:"rgba(16,185,129,0.55)" },
};

// ─────────────────────────────────────────────────────────────────────────────
//  STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const APP_NAME = "Ultimate Planner";
const APP_TAGLINE = "Grow in every dimension";
const APP_VERSION = "4.0";

const STORE_KEY = "up_data_v4";
const AUTH_KEY  = "up_auth_v4";
const loadAuth = ()=>{ try{ return JSON.parse(localStorage.getItem(AUTH_KEY)||"null"); }catch{ return null; }};
const saveAuth = u=>localStorage.setItem(AUTH_KEY,JSON.stringify(u));
const clearAuth= ()=>localStorage.removeItem(AUTH_KEY);
const loadData = id=>{ try{ const r=localStorage.getItem(`${STORE_KEY}_${id}`); return r?JSON.parse(r):null; }catch{ return null; }};
const saveData = (id,d)=>localStorage.setItem(`${STORE_KEY}_${id}`,JSON.stringify(d));

// ─────────────────────────────────────────────────────────────────────────────
//  DEFAULT DATA
// ─────────────────────────────────────────────────────────────────────────────
function mkDefault() {
  const days={};
  DAYS.forEach(d=>{ days[d]={tasks:[],events:[],notes:""}; });
  return {
    kis:[
      {id:"ki1",category:"intellectual",name:"Study / Reading",        unit:"min",  weeklyGoal:60,dailyLogs:{}},
      {id:"ki2",category:"social",       name:"Meaningful Conversations",unit:"times",weeklyGoal:5, dailyLogs:{}},
      {id:"ki3",category:"physical",     name:"Workouts",              unit:"times",weeklyGoal:4, dailyLogs:{}},
      {id:"ki4",category:"spiritual",    name:"Meditation / Prayer",   unit:"min",  weeklyGoal:70,dailyLogs:{}},
    ],
    yearlyGoals:[], financialGoals:[], weekDays:days,
    reflections:[], currentReflection:{wentWell:"",improve:"",catNotes:{},rating:7,commitment:""},
    selectedDay:"Monday", earnedAchievements:[], achievementStats:{kiWeeksOver50:0,kiWeeksOver80:0,kiPerfectWeeks:0,kiStreak:0,grandSlam:0},
    calendarConnected:false, calendarEvents:[],
    inspiration:[],
    profile:{firstName:"",lastName:"",city:"",state:"",hobbies:"",bio:"",avatarUrl:"",avatarColor:"linear-gradient(135deg,#4f9cf9,#c084fc)"},
    posts:[],
    friends:[],
    friendRequests:[],
    routines:{
      morning:[],
      evening:[],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const uid  = ()=>Math.random().toString(36).slice(2,9);
const cc   = id=>CATS.find(c=>c.id===id)?.color||"#888";
const cl   = id=>CATS.find(c=>c.id===id)?.light||"rgba(136,136,136,0.1)";
const ci   = id=>CATS.find(c=>c.id===id)?.icon||"◈";
const pad  = n=>String(n).padStart(2,"0");
const fmt$ = n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0}).format(n||0);

function getMon(){ const n=new Date(),diff=n.getDay()===0?-6:1-n.getDay(),m=new Date(n);m.setDate(n.getDate()+diff);return m; }
function dayDate(i){ const m=getMon(),d=new Date(m);d.setDate(m.getDate()+i);return d; }

function toICS(events){
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//WeeklyPlannerApp//EN","CALSCALE:GREGORIAN"];
  events.forEach(e=>{ lines.push("BEGIN:VEVENT",`UID:${uid()}@wpa`,`DTSTART:${e.dtstart}`,`DTEND:${e.dtend}`,`SUMMARY:${e.title}`,`DESCRIPTION:${(e.desc||"").replace(/[\r\n]/g," ")}`,`CATEGORIES:${e.category}`,"END:VEVENT"); });
  lines.push("END:VCALENDAR"); return lines.join("\r\n");
}

function evalAchievements(data, stats, authUser){
  return ACHIEVEMENTS.filter(a=>{
    try{ return a.check(data, stats||data.achievementStats||{}, authUser||null); }catch{ return false; }
  }).map(a=>a.id);
}

// ─────────────────────────────────────────────────────────────────────────────
//  MINI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Ring({pct,size=72,stroke=6,color="#4f9cf9"}){
  const r=(size-stroke)/2,circ=2*Math.PI*r,dash=circ*Math.min(pct/100,1);
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:"stroke-dasharray 0.7s ease"}}/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={color} fontSize={size*0.19} fontFamily="'Syne',serif" fontWeight="700">{pct}%</text>
    </svg>
  );
}

function Bar({pct,color,h=5}){
  return(
    <div style={{background:"rgba(255,255,255,0.07)",borderRadius:h,overflow:"hidden",height:h}}>
      <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:color,borderRadius:h,transition:"width 0.6s ease"}}/>
    </div>
  );
}

function Tag({catId,children}){
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:cl(catId),border:`1px solid ${cc(catId)}40`,color:cc(catId),borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>
      {ci(catId)}{children||CATS.find(c=>c.id===catId)?.label}
    </span>
  );
}

function Lock({onUpgrade,msg}){
  return(
    <div style={{textAlign:"center",padding:"40px 20px",background:"rgba(245,158,11,0.05)",border:"1px dashed rgba(245,158,11,0.3)",borderRadius:14}}>
      <div style={{fontSize:36,marginBottom:12}}>🔒</div>
      <div style={{fontFamily:"'Syne',serif",fontSize:18,color:"#f59e0b",marginBottom:6}}>Premium Feature</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:18,lineHeight:1.6}}>{msg||"Upgrade to Pro to unlock this feature."}</div>
      <button onClick={onUpgrade} style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",color:"#000",padding:"11px 28px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:800}}>
        Upgrade to Pro →
      </button>
    </div>
  );
}

// Reusable custom time picker — any time to the minute
function TimeInput({value,onChange,style}){
  // Parse value like "9:15 AM" into parts
  const parseVal=(v)=>{
    if(!v)return{h:"9",m:"00",ampm:"AM"};
    const [tp,ap]=(v||"").split(" ");
    const [hh,mm]=(tp||"9:00").split(":");
    return{h:String(parseInt(hh)||9),m:String(mm||"00").padStart(2,"0"),ampm:ap||"AM"};
  };
  const {h,m,ampm}=parseVal(value);
  const emit=(hh,mm,ap)=>{
    const padH=String(hh).padStart(1,""); // keep as "9" not "09"
    onChange(`${padH}:${String(mm).padStart(2,"0")} ${ap}`);
  };
  const hrs=Array.from({length:12},(_,i)=>String(i+1));
  const mins=Array.from({length:60},(_,i)=>String(i).padStart(2,"0"));
  const sel={background:"#1a1d26",border:"1px solid rgba(255,255,255,0.1)",color:"#f0ece4",borderRadius:7,padding:"7px 4px",fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none",cursor:"pointer",...(style||{})};
  return(
    <div style={{display:"flex",gap:3,alignItems:"center"}}>
      <select value={h} onChange={e=>emit(e.target.value,m,ampm)} style={{...sel,width:44}}>
        {hrs.map(x=><option key={x} value={x}>{x}</option>)}
      </select>
      <span style={{color:"rgba(255,255,255,0.4)",fontSize:14}}>:</span>
      <select value={m} onChange={e=>emit(h,e.target.value,ampm)} style={{...sel,width:50}}>
        {mins.map(x=><option key={x} value={x}>{x}</option>)}
      </select>
      <select value={ampm} onChange={e=>emit(h,m,e.target.value)} style={{...sel,width:52}}>
        <option>AM</option><option>PM</option>
      </select>
    </div>
  );
}
function MedalCard({achievement,earned}){
  const tc=TIER_COLORS[achievement.tier];
  return(
    <div style={{
      background:earned?tc.bg:"rgba(255,255,255,0.02)",
      border:`1px solid ${earned?tc.border:"rgba(255,255,255,0.07)"}`,
      borderRadius:12,padding:"14px 16px",
      boxShadow:earned?`0 0 18px ${tc.glow}`:"none",
      opacity:earned?1:0.45,
      transition:"all 0.3s ease",
      position:"relative",overflow:"hidden",
    }}>
      {earned&&<div style={{position:"absolute",top:0,right:0,width:40,height:40,background:`radial-gradient(circle at top right,${tc.glow},transparent)`,pointerEvents:"none"}}/>}
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{fontSize:28,lineHeight:1,filter:earned?"none":"grayscale(1)"}}>{achievement.icon}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <span style={{fontSize:13,fontWeight:700,color:earned?tc.text:"rgba(255,255,255,0.4)"}}>{achievement.title}</span>
            <span style={{fontSize:9,fontWeight:800,letterSpacing:"1px",color:earned?tc.text:"rgba(255,255,255,0.2)",textTransform:"uppercase",
              background:earned?tc.bg:"transparent",border:earned?`1px solid ${tc.border}`:"none",borderRadius:4,padding:"1px 5px"}}>
              {achievement.tier}
            </span>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",lineHeight:1.5}}>{achievement.desc}</div>
        </div>
        {earned&&<div style={{width:20,height:20,borderRadius:"50%",background:tc.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>✓</div>}
      </div>
    </div>
  );
}

// Toast notification
function Toast({msg,onDone}){
  useEffect(()=>{ const t=setTimeout(onDone,3500); return()=>clearTimeout(t); },[]);
  const tc=TIER_COLORS[ACHIEVEMENTS.find(a=>a.id===msg.achievementId)?.tier||"bronze"];
  return(
    <div style={{
      background:"linear-gradient(135deg,#1a1f2e,#0f1420)",
      border:`1px solid ${tc?.border||"rgba(251,191,36,0.5)"}`,
      borderRadius:14,
      padding:"14px 20px",
      boxShadow:`0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${tc?.glow||"rgba(251,191,36,0.25)"}`,
      display:"flex",alignItems:"center",gap:12,maxWidth:320,
      animation:"slideIn 0.4s cubic-bezier(.16,1,.3,1)",
      pointerEvents:"none",
    }}>
      <style>{`@keyframes slideIn{from{transform:translateX(80px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <span style={{fontSize:26}}>{msg.icon}</span>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:tc?.text||"#fbbf24",marginBottom:2}}>🏅 Achievement Unlocked!</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>{msg.title}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({onAuth}){
  const [mode,setMode]=useState("login"); // login | signup | forgot
  const [firstName,setFirstName]=useState("");
  const [lastName,setLastName]=useState("");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [newPass,setNewPass]=useState("");
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [animIn,setAnimIn]=useState(false);
  useEffect(()=>{setTimeout(()=>setAnimIn(true),60);},[]);

  const submit=()=>{
    setError(""); setSuccess("");
    if(mode==="forgot"){
      if(!email.trim()){setError("Enter your email address.");return;}
      const reg=JSON.parse(localStorage.getItem("up_users")||"{}");
      const u=reg[email.toLowerCase()];
      if(!u){setError("No account found with that email.");return;}
      if(!newPass||newPass.length<6){setError("New password must be at least 6 characters.");return;}
      reg[email.toLowerCase()].pass=newPass;
      localStorage.setItem("up_users",JSON.stringify(reg));
      setSuccess("✅ Password reset! You can now sign in.");
      setMode("login"); setNewPass(""); return;
    }
    if(!email.trim()||!pass.trim()){setError("Please fill in all fields.");return;}
    if(mode==="signup"&&(!firstName.trim()||!lastName.trim())){setError("Please enter your first and last name.");return;}
    if(pass.length<6){setError("Password must be at least 6 characters.");return;}
    const reg=JSON.parse(localStorage.getItem("up_users")||"{}");
    if(mode==="login"){
      const u=reg[email.toLowerCase()];
      if(!u){setError("No account found. Please sign up.");return;}
      if(u.pass!==pass){setError("Incorrect password.");return;}
      const au={id:u.id,name:u.name,email:u.email,isPro:u.isPro||false,firstName:u.firstName||u.name,lastName:u.lastName||""};
      saveAuth(au); onAuth(au);
    } else {
      if(reg[email.toLowerCase()]){setError("Email already registered.");return;}
      const fullName=`${firstName.trim()} ${lastName.trim()}`;
      const nu={id:uid(),name:fullName,firstName:firstName.trim(),lastName:lastName.trim(),email:email.toLowerCase(),pass,isPro:false};
      reg[email.toLowerCase()]=nu; localStorage.setItem("up_users",JSON.stringify(reg));
      const au={id:nu.id,name:nu.name,email:nu.email,isPro:false,firstName:nu.firstName,lastName:nu.lastName};
      saveAuth(au); onAuth(au);
    }
  };

  const inp={background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,color:"#f0ece4",padding:"13px 16px",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box"};
  const lbl={fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"1.5px",textTransform:"uppercase",display:"block",marginBottom:6};

  return(
    <div style={{minHeight:"100vh",background:"#08090d",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",
      backgroundImage:"radial-gradient(ellipse at 20% 20%,rgba(79,156,249,0.08) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(251,191,36,0.07) 0%,transparent 60%)"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box}input:focus,textarea:focus,select:focus{border-color:rgba(79,156,249,0.6)!important;box-shadow:0 0 0 3px rgba(79,156,249,0.1)!important}`}</style>
      <div style={{width:"100%",maxWidth:440,padding:"0 20px",opacity:animIn?1:0,transform:animIn?"translateY(0)":"translateY(24px)",transition:"all 0.6s cubic-bezier(.16,1,.3,1)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:60,height:60,borderRadius:18,background:"linear-gradient(135deg,#4f9cf9,#fbbf24)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 14px",boxShadow:"0 0 40px rgba(79,156,249,0.3)"}}>◈</div>
          <div style={{fontFamily:"'Syne',serif",fontSize:26,fontWeight:800,color:"#fff",letterSpacing:"-0.5px"}}>{APP_NAME}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:"2px",textTransform:"uppercase",marginTop:4}}>Grow in every dimension</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.04)",borderRadius:20,border:"1px solid rgba(255,255,255,0.09)",padding:32,backdropFilter:"blur(20px)"}}>
          {mode!=="forgot"&&(
            <div style={{display:"flex",gap:6,marginBottom:24,background:"rgba(255,255,255,0.05)",borderRadius:10,padding:4}}>
              {["login","signup"].map(m=>(
                <button key={m} onClick={()=>{setMode(m);setError("");setSuccess("");}} style={{flex:1,padding:"9px 0",border:"none",cursor:"pointer",background:mode===m?"rgba(79,156,249,0.2)":"transparent",color:mode===m?"#4f9cf9":"rgba(255,255,255,0.4)",borderRadius:8,fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"}}>
                  {m==="login"?"Sign In":"Create Account"}
                </button>
              ))}
            </div>
          )}
          {mode==="forgot"&&(
            <div style={{marginBottom:20}}>
              <button onClick={()=>{setMode("login");setError("");setSuccess("");}} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}}>← Back to Sign In</button>
              <div style={{fontFamily:"'Syne',serif",fontSize:20,fontWeight:700,color:"#fff",marginTop:12}}>Reset Password</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:4}}>Enter your email and choose a new password.</div>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {mode==="signup"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={lbl}>First Name</label><input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="First" style={inp}/></div>
                <div><label style={lbl}>Last Name</label><input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Last" style={inp}/></div>
              </div>
            )}
            <div><label style={lbl}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp}/></div>
            {mode!=="forgot"&&<div><label style={lbl}>Password</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••" style={inp}/></div>}
            {mode==="forgot"&&<div><label style={lbl}>New Password</label><input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="New password (6+ chars)" style={inp}/></div>}
          </div>
          {error&&<div style={{background:"rgba(249,123,79,0.12)",border:"1px solid rgba(249,123,79,0.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#f97b4f",marginTop:14}}>{error}</div>}
          {success&&<div style={{background:"rgba(52,201,138,0.12)",border:"1px solid rgba(52,201,138,0.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#34c98a",marginTop:14}}>{success}</div>}
          <button onClick={submit} style={{width:"100%",marginTop:20,background:"linear-gradient(135deg,#4f9cf9,#fbbf24)",border:"none",color:"#fff",padding:"14px 0",borderRadius:12,cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:"'DM Sans',sans-serif",boxShadow:"0 4px 20px rgba(79,156,249,0.3)"}}>
            {mode==="login"?"Sign In →":mode==="signup"?"Create Account →":"Reset Password →"}
          </button>
          {mode==="login"&&(
            <button onClick={()=>{setMode("forgot");setError("");setSuccess("");}} style={{display:"block",width:"100%",marginTop:12,background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif",textAlign:"center"}}>
              Forgot password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  UPGRADE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function UpgradeModal({onClose,onUpgrade}){
  const [sel,setSel]=useState("yearly");
  const features=[
    {icon:"🤖",title:"AI Planning Coach",desc:"Claude AI that knows your goals, KIs, and helps you plan."},
    {icon:"🚫",title:"No Ads — Ever",desc:"Completely ad-free experience on all platforms."},
    {icon:"♾️",title:"Unlimited Everything",desc:"No limits on indicators, goals, tasks, or financial goals."},
    {icon:"🗓️",title:"Google Calendar Sync",desc:"Real-time sync — tasks, goal steps, and deadlines."},
    {icon:"☀️",title:"Daily Motivation Notifications",desc:"Morning inspiration from your own quote library."},
    {icon:"📊",title:"Advanced Analytics",desc:"Line graphs, KI trends, goal progress charts."},
    {icon:"💡",title:"Inspiration Library",desc:"Save quotes, scriptures, speeches, affirmations."},
    {icon:"☁️",title:"Cloud Backup",desc:"Your data synced and safe across all devices."},
  ];
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0f1117",borderRadius:24,border:"1px solid rgba(251,191,36,0.2)",padding:36,maxWidth:680,width:"100%",maxHeight:"90vh",overflow:"auto",boxShadow:"0 0 80px rgba(251,191,36,0.12)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:56,height:56,borderRadius:18,background:"linear-gradient(135deg,#fbbf24,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 12px",boxShadow:"0 0 30px rgba(251,191,36,0.4)"}}>★</div>
          <div style={{fontSize:12,color:"#fbbf24",letterSpacing:"3px",textTransform:"uppercase",marginBottom:8,fontWeight:700}}>Ultimate Planner Pro</div>
          <div style={{fontFamily:"'Syne',serif",fontSize:26,fontWeight:800,color:"#fff",marginBottom:6}}>Unlock Your Full Potential</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>AI coaching, no ads, unlimited everything — and more.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
          {features.map((f,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.07)",display:"flex",gap:10}}>
              <span style={{fontSize:20,flexShrink:0}}>{f.icon}</span>
              <div><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:2}}>{f.title}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)",lineHeight:1.5}}>{f.desc}</div></div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:22}}>
          {PLANS.map(p=>(
            <div key={p.id} onClick={()=>setSel(p.id)} style={{borderRadius:14,padding:18,cursor:"pointer",textAlign:"center",border:`2px solid ${sel===p.id?"#fbbf24":"rgba(255,255,255,0.08)"}`,background:sel===p.id?"rgba(251,191,36,0.08)":"rgba(255,255,255,0.03)",position:"relative",transition:"all 0.2s"}}>
              {p.popular&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:"#fbbf24",color:"#000",fontSize:9,fontWeight:800,padding:"2px 10px",borderRadius:20}}>MOST POPULAR</div>}
              {p.save&&<div style={{fontSize:10,color:"#34c98a",fontWeight:700,marginBottom:3}}>{p.save}</div>}
              <div style={{fontFamily:"'Syne',serif",fontSize:22,fontWeight:800,color:sel===p.id?"#fbbf24":"#fff"}}>{p.price}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{p.period}</div>
              <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.6)",marginTop:5}}>{p.label}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>{onUpgrade();onClose();}} style={{width:"100%",background:"linear-gradient(135deg,#fbbf24,#d97706)",border:"none",color:"#000",padding:"15px 0",borderRadius:12,cursor:"pointer",fontSize:16,fontWeight:800,fontFamily:"'DM Sans',sans-serif",boxShadow:"0 4px 24px rgba(251,191,36,0.4)"}}>
          Start 7-Day Free Trial → {PLANS.find(p=>p.id===sel)?.price}{PLANS.find(p=>p.id===sel)?.period}
        </button>
        <div style={{textAlign:"center",marginTop:10,fontSize:11,color:"rgba(255,255,255,0.25)"}}>7-day free trial · Cancel anytime · Secure via RevenueCat &amp; Stripe</div>
        <button onClick={onClose} style={{display:"block",margin:"12px auto 0",background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:13}}>Maybe later</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CALORIE CALCULATOR MODAL
// ─────────────────────────────────────────────────────────────────────────────
function CalorieModal({calorieGoal,setCalorieGoal,RATE_MODES,ACTIVITY_LEVELS,calcCalories}){
  const res=calcCalories(calorieGoal);
  const mode=RATE_MODES.find(r=>r.id===calorieGoal.mode)||RATE_MODES[1];
  const gaining=parseFloat(calorieGoal.targetWeight)>parseFloat(calorieGoal.currentWeight);
  const GAIN_FOODS=["🥩 Chicken breast (high protein)","🥚 Eggs & egg whites","🍚 Brown rice & oats","🥜 Peanut butter & nuts","🥛 Greek yogurt / protein shakes","🧇 Whole grain waffles","🫐 Berries & bananas","🥑 Avocado (healthy fats)","🐟 Salmon (omega-3 + protein)","🫙 Cottage cheese before bed"];
  const LOSE_FOODS=["🥗 Large salads with lean protein","🍗 Grilled chicken (low calorie, high protein)","🥦 Broccoli, spinach, cauliflower","🍓 Strawberries & watermelon (high volume)","🍲 Veggie soups (filling, low cal)","🥒 Cucumber, celery snacks","🐟 White fish (tilapia, cod)","🧃 Water, green tea, black coffee","🫘 Lentils & black beans","🍳 Egg whites, turkey bacon"];
  const foods=gaining?GAIN_FOODS:LOSE_FOODS;
  const S2={inp:{background:"#1a1d26",border:"1px solid rgba(255,255,255,0.1)",color:"#f0ece4",borderRadius:8,padding:"9px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"},lbl:{display:"block",fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:5,fontFamily:"'DM Sans',sans-serif"},sel:{background:"#1a1d26",border:"1px solid rgba(255,255,255,0.1)",color:"#f0ece4",borderRadius:8,padding:"9px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none",width:"100%",cursor:"pointer"}};
  return(
    <div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}} onClick={e=>e.target===e.currentTarget&&setCalorieGoal(null)}>
      <div style={{background:"#0f1117",borderRadius:22,border:"1px solid rgba(249,123,79,0.3)",padding:32,maxWidth:600,width:"100%",maxHeight:"90vh",overflow:"auto",boxShadow:"0 0 60px rgba(249,123,79,0.15)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div>
            <div style={{fontFamily:"'Syne',serif",fontSize:20,fontWeight:800,color:"#fff"}}>🥗 Calorie Calculator</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:3}}>{gaining?"Weight Gain":"Weight Loss"} Plan</div>
          </div>
          <button onClick={()=>setCalorieGoal(null)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.4)",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
          {[
            {label:"Current Weight (lbs)",field:"currentWeight",type:"number",placeholder:"e.g. 185"},
            {label:"Target Weight (lbs)",field:"targetWeight",type:"number",placeholder:"e.g. 195"},
            {label:"Height (inches)",field:"height",type:"number",placeholder:"e.g. 70"},
            {label:"Age",field:"age",type:"number",placeholder:"e.g. 25"},
            {label:"Sex",field:"sex",type:"select",options:[{v:"male",l:"Male"},{v:"female",l:"Female"}]},
            {label:"Activity Level",field:"activity",type:"select",options:ACTIVITY_LEVELS.map(a=>({v:a.id,l:a.label}))},
          ].map(f=>(
            <div key={f.field}>
              <label style={S2.lbl}>{f.label}</label>
              {f.type==="select"
                ?<select value={calorieGoal[f.field]||""} onChange={e=>setCalorieGoal(p=>({...p,[f.field]:e.target.value}))} style={S2.sel}>
                  {f.options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                :<input type="number" placeholder={f.placeholder} value={calorieGoal[f.field]||""} onChange={e=>setCalorieGoal(p=>({...p,[f.field]:parseFloat(e.target.value)||""}))} style={S2.inp}/>
              }
            </div>
          ))}
        </div>
        <div style={{marginBottom:18}}>
          <label style={S2.lbl}>Choose Your Rate</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {RATE_MODES.map(r=>(
              <div key={r.id} onClick={()=>setCalorieGoal(p=>({...p,mode:r.id}))} style={{borderRadius:12,padding:"12px 14px",cursor:"pointer",border:`2px solid ${calorieGoal.mode===r.id?r.color:"rgba(255,255,255,0.1)"}`,background:calorieGoal.mode===r.id?`${r.color}15`:"rgba(255,255,255,0.03)",transition:"all 0.2s"}}>
                <div style={{fontSize:14,fontWeight:700,color:calorieGoal.mode===r.id?r.color:"#fff"}}>{r.label}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:4,lineHeight:1.4}}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
        {res?(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
              {[
                {label:"Daily Calories",value:res.target,unit:"cal/day",color:mode.color},
                {label:"TDEE (maintenance)",value:res.tdee,unit:"cal/day",color:"rgba(255,255,255,0.6)"},
                {label:`${gaining?"+":"-"} Calories`,value:`${gaining?"+":"-"}${res.calDelta}`,unit:"vs maintenance",color:gaining?"#34c98a":"#f97b4f"},
                {label:"Est. Time to Goal",value:res.weeksToGoal,unit:"weeks",color:"#c084fc"},
              ].map(s=>(
                <div key={s.label} style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"12px 10px",textAlign:"center",border:"1px solid rgba(255,255,255,0.07)"}}>
                  <div style={{fontSize:20,fontWeight:800,color:s.color,fontFamily:"'Syne',serif"}}>{s.value}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginTop:3}}>{s.label}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.25)"}}>{s.unit}</div>
                </div>
              ))}
            </div>
            <div style={{background:"rgba(79,156,249,0.06)",borderRadius:12,padding:"14px 16px",marginBottom:16,border:"1px solid rgba(79,156,249,0.15)"}}>
              <div style={{fontSize:11,color:"#4f9cf9",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Recommended Daily Macros</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[{label:"Protein",value:res.protein,unit:"g",color:"#f97b4f"},{label:"Carbs",value:res.carbs,unit:"g",color:"#4f9cf9"},{label:"Fat",value:res.fat,unit:"g",color:"#fbbf24"}].map(m=>(
                  <div key={m.label} style={{textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:800,color:m.color}}>{m.value}{m.unit}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"rgba(52,201,138,0.06)",borderRadius:12,padding:"14px 16px",border:"1px solid rgba(52,201,138,0.15)"}}>
              <div style={{fontSize:11,color:"#34c98a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Sample Foods to Eat</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {foods.map((f,i)=><div key={i} style={{fontSize:12,color:"rgba(255,255,255,0.7)",padding:"5px 8px",background:"rgba(255,255,255,0.03)",borderRadius:7}}>{f}</div>)}
              </div>
            </div>
            <div style={{marginTop:12,fontSize:11,color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>* Based on Mifflin-St Jeor formula. Consult a physician or registered dietitian for personalized advice.</div>
          </div>
        ):(
          <div style={{textAlign:"center",padding:"20px 0",color:"rgba(255,255,255,0.3)",fontSize:13}}>Fill in your details above to see your calorie plan.</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App(){
  const [authUser,setAuthUser]=useState(()=>loadAuth());
  const [data,setData]=useState(null);
  const [tab,setTab]=useState("dashboard");
  const [showUpgrade,setShowUpgrade]=useState(false);
  const [animIn,setAnimIn]=useState(false);
  const [toasts,setToasts]=useState([]);
  const prevEarned=useRef([]);

  // forms
  const [newKI,setNewKI]=useState({category:"intellectual",name:"",unit:"times",weeklyGoal:5});
  const [newGoal,setNewGoal]=useState({category:"intellectual",title:"",description:"",target:"",progress:0,steps:[],weekSteps:""});
  const [showGoalForm,setShowGoalForm]=useState(false);
  const [editGoalId,setEditGoalId]=useState(null);
  const [stepInputs,setStepInputs]=useState({});
  const [newTask,setNewTask]=useState({time:"9:00 AM",title:"",category:"intellectual",notes:"",repeat:"none",type:"task"});
  // Calendar events (Google Calendar-style)
  const [newEvent,setNewEvent]=useState({title:"",date:"",startTime:"9:00 AM",endTime:"10:00 AM",type:"work",notes:"",color:"#4f9cf9",repeat:"none"});
  const [showEventForm,setShowEventForm]=useState(false);
  // Social / community
  const [newPost,setNewPost]=useState({text:"",imageUrl:"",videoUrl:"",category:""});
  const [showPostForm,setShowPostForm]=useState(false);
  const [addFriendEmail,setAddFriendEmail]=useState("");
  const [socialTab,setSocialTab]=useState("feed"); // feed|friends|requests
  // Profile editing
  const [editingProfile,setEditingProfile]=useState(false);
  const [profileDraft,setProfileDraft]=useState(null);
  const [newFinGoal,setNewFinGoal]=useState({name:"",targetAmount:0,saved:0,category:"savings",deadline:"",notes:"",deposits:[]});
  const [showFinForm,setShowFinForm]=useState(false);
  const [editFinId,setEditFinId]=useState(null);
  const [depositInput,setDepositInput]=useState({});
  const [calFilter,setCalFilter]=useState("all");
  const [calSyncStatus,setCalSyncStatus]=useState("idle"); // idle|syncing|synced|error
  const [calSel,setCalSel]=useState({});
  const [achFilter,setAchFilter]=useState("all");
  const [showSundayReflection,setShowSundayReflection]=useState(false);
  const [sundayDismissed,setSundayDismissed]=useState(false);
  const [planningWizardStep,setPlanningWizardStep]=useState(0);
  const [planningWizardMode,setPlanningWizardMode]=useState("plan");
  const [wizardGoalIdx,setWizardGoalIdx]=useState(0);
  const [newInspo,setNewInspo]=useState({type:"quote",text:"",author:"",category:"motivation"});
  const [showInspoForm,setShowInspoForm]=useState(false);
  const [inspoFilter,setInspoFilter]=useState("all");
  // Nav customization
  const [tabOrder,setTabOrder]=useState(()=>{
    try{ const s=localStorage.getItem("up_taborder"); return s?JSON.parse(s):DEFAULT_TABS.map(t=>t.id); }catch{ return DEFAULT_TABS.map(t=>t.id); }
  });
  const [customizingNav,setCustomizingNav]=useState(false);
  const [dragTabIdx,setDragTabIdx]=useState(null);
  // Social emoji picker
  const [emojiPickerPostId,setEmojiPickerPostId]=useState(null);
  // Pro Daily Planner Wizard
  const [showDailyPlanner,setShowDailyPlanner]=useState(false);
  const [dailyPlannerDay,setDailyPlannerDay]=useState(0);
  const [dpNewTask,setDpNewTask]=useState({time:"9:00 AM",title:"",category:"intellectual",notes:"",repeat:"none"});
  const [dpNewEvent,setDpNewEvent]=useState({title:"",startTime:"9:00 AM",endTime:"10:00 AM",type:"work",notes:""});
  // Calorie calculator (moved from inside renderYearly to fix hooks rule violation)
  const [calorieGoal,setCalorieGoal]=useState(null);
  // Browser notification permission
  const [notifPermission,setNotifPermission]=useState(()=>typeof Notification!=="undefined"?Notification.permission:"denied");
  // Routines
  const [routineEditType,setRoutineEditType]=useState(null); // "morning"|"evening"|null
  const [routineItemDraft,setRoutineItemDraft]=useState({time:"6:00 AM",title:"",duration:10,notes:""});
  // AI Coach chatbot
  const [chatMessages,setChatMessages]=useState([]);
  const [chatInput,setChatInput]=useState("");
  const [chatLoading,setChatLoading]=useState(false);
  const chatEndRef=useRef(null);
  // Morning inspiration notification
  const [morningInspo,setMorningInspo]=useState(null);
  const [showMorningInspo,setShowMorningInspo]=useState(false);

  useEffect(()=>{
    if(!authUser)return;
    const d=loadData(authUser.id)||mkDefault();
    setData(d);
    setTimeout(()=>setAnimIn(true),80);
  },[authUser]);

  // Auto-save
  useEffect(()=>{ if(authUser&&data)saveData(authUser.id,data); },[data,authUser]);

  // Achievement checker
  useEffect(()=>{
    if(!data)return;
    const earned=evalAchievements(data, data.achievementStats, authUser);
    const newOnes=earned.filter(id=>!prevEarned.current.includes(id));
    if(newOnes.length>0){
      newOnes.forEach(id=>{
        const a=ACHIEVEMENTS.find(x=>x.id===id);
        if(a) setToasts(t=>[...t,{id:uid(),icon:a.icon,title:a.title,achievementId:a.id}]);
      });
      upd(p=>({...p,earnedAchievements:earned}));
    }
    prevEarned.current=earned;
  },[data,authUser]);

  // Login streak tracker
  useEffect(()=>{
    if(!data||!authUser)return;
    const today=new Date().toDateString();
    const lastLogin=localStorage.getItem(`up_lastlogin_${authUser.id}`);
    const lastLoginDate=lastLogin?new Date(lastLogin):null;
    const yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
    if(lastLogin!==today){
      localStorage.setItem(`up_lastlogin_${authUser.id}`,today);
      const currentStreak=data.achievementStats?.loginStreak||0;
      const isConsecutive=lastLoginDate&&lastLoginDate.toDateString()===yesterday.toDateString();
      const newStreak=isConsecutive?currentStreak+1:1;
      if(newStreak!==currentStreak){
        upd(p=>({...p,achievementStats:{...p.achievementStats,loginStreak:newStreak}}));
      }
    }
  },[authUser?.id]);

  // Sunday reflection auto-popup
  useEffect(()=>{
    if(!data)return;
    const day=new Date().getDay(); // 0=Sunday
    const lastReflect=(data.reflections||[])[0]?.week;
    const thisWeek=getMon().toLocaleDateString();
    const alreadyDoneThisWeek=lastReflect===thisWeek;
    if(day===0&&!alreadyDoneThisWeek&&!sundayDismissed){
      setTimeout(()=>setShowSundayReflection(true),1200);
    }
  },[data,sundayDismissed]);

  // Morning inspiration notification (Pro only)
  useEffect(()=>{
    if(!data||!authUser?.isPro)return;
    const inspos=data.inspiration||[];
    if(!inspos.length)return;
    const today=new Date().toDateString();
    const lastShown=localStorage.getItem(`up_inspo_shown_${authUser.id}`);
    if(lastShown===today)return;
    const hour=new Date().getHours();
    // Show between 6am-10am, or immediately if first time today
    if(hour>=6&&hour<=10||lastShown!==today){
      const random=inspos[Math.floor(Math.random()*inspos.length)];
      setMorningInspo(random);
      setTimeout(()=>{
        setShowMorningInspo(true);
        localStorage.setItem(`up_inspo_shown_${authUser.id}`,today);
      },2500);
    }
  },[data,authUser]);

  // Notification scheduler — fires every minute to check upcoming tasks/events
  useEffect(()=>{
    if(!data||!authUser)return;
    if(typeof Notification==="undefined"||Notification.permission!=="granted")return;
    const LOOK_AHEAD_MIN=15;
    const LOOK_AHEAD_30=30;
    const checkAndNotify=()=>{
      const now=new Date();
      const todayName=DAYS[(now.getDay()+6)%7];
      const dayData=data.weekDays[todayName]||{};
      const allItems=[
        ...(dayData.tasks||[]).map(t=>({...t,kind:"task",label:t.title})),
        ...(dayData.events||[]).map(e=>({...e,kind:"event",label:e.title})),
        ...((data.routines?.morning||[]).map(r=>({...r,kind:"routine",label:r.title}))),
        ...((data.routines?.evening||[]).map(r=>({...r,kind:"routine",label:r.title}))),
      ];
      const parseTime=(timeStr)=>{
        if(!timeStr)return null;
        const [tp,ap]=(timeStr+" ").split(" ");
        let [hh,mm]=(tp||"0:00").split(":").map(Number);
        if(ap==="PM"&&hh!==12)hh+=12;
        if(ap==="AM"&&hh===12)hh=0;
        const t=new Date(now); t.setHours(hh,mm||0,0,0); return t;
      };
      allItems.forEach(item=>{
        const timeStr=item.time||item.startTime;
        if(!timeStr)return;
        const itemTime=parseTime(timeStr);
        if(!itemTime)return;
        const diffMin=(itemTime-now)/60000;
        // 30-min advance notice
        if(diffMin>LOOK_AHEAD_MIN&&diffMin<=LOOK_AHEAD_30){
          const key=`notif_30_${authUser.id}_${item.id}_${now.toDateString()}`;
          if(!sessionStorage.getItem(key)){
            sessionStorage.setItem(key,"1");
            new Notification("🗓️ Coming up in 30 minutes",{
              body:`${item.label} at ${timeStr}`,icon:"/icon.png",tag:key,
            });
          }
        }
        // 15-min advance notice
        if(diffMin>0&&diffMin<=LOOK_AHEAD_MIN){
          const key=`notif_15_${authUser.id}_${item.id}_${now.toDateString()}`;
          if(!sessionStorage.getItem(key)){
            sessionStorage.setItem(key,"1");
            new Notification("⏰ Starting in 15 minutes",{
              body:`${item.label} at ${timeStr}`,icon:"/icon.png",tag:key,
            });
          }
        }
        // Fire at exact time
        if(diffMin<=0&&diffMin>-2){
          const key=`notif_now_${authUser.id}_${item.id}_${now.toDateString()}`;
          if(!sessionStorage.getItem(key)){
            sessionStorage.setItem(key,"1");
            new Notification(`🔔 Time to: ${item.label}`,{
              body:`Scheduled for ${timeStr} · Stay on track!`,icon:"/icon.png",tag:key,
            });
          }
        }
      });
      // "What's next" summary every 2 hours
      const h=now.getHours(); const m=now.getMinutes();
      if(m>=0&&m<2){
        const upcoming=allItems
          .map(item=>({item,t:parseTime(item.time||item.startTime)}))
          .filter(({t})=>t&&(t-now)/60000>0)
          .sort((a,b)=>a.t-b.t)
          .slice(0,3);
        if(upcoming.length>0&&(h===7||h===9||h===12||h===15||h===17||h===19)){
          const key=`notif_sum_${authUser.id}_${h}_${now.toDateString()}`;
          if(!sessionStorage.getItem(key)){
            sessionStorage.setItem(key,"1");
            new Notification("📋 What's coming up",{
              body:upcoming.map(({item})=>`• ${item.label} at ${item.time||item.startTime}`).join("\n"),
              icon:"/icon.png",tag:key,
            });
          }
        }
      }
    };
    checkAndNotify();
    const interval=setInterval(checkAndNotify,60000);
    return()=>clearInterval(interval);
  },[data,authUser,notifPermission]);

  const upd=useCallback(fn=>setData(prev=>{const next={...fn(prev)};return next;}),[]);
  const kiTotal=k=>Object.values(k.dailyLogs||{}).reduce((a,b)=>a+(parseFloat(b)||0),0);
  const catPct=useCallback(catId=>{
    if(!data)return 0;
    const ks=data.kis.filter(k=>k.category===catId);
    if(!ks.length)return 0;
    return Math.round(ks.reduce((a,k)=>a+Math.min(kiTotal(k)/k.weeklyGoal,1),0)/ks.length*100);
  },[data]);
  const overallPct=useCallback(()=>{
    if(!data||!data.kis.length)return 0;
    return Math.round(data.kis.reduce((a,k)=>a+Math.min(kiTotal(k)/k.weeklyGoal,1),0)/data.kis.length*100);
  },[data]);

  const isPro=authUser?.isPro;
  const goPro=()=>setShowUpgrade(true);

  // Ordered tabs - persist order
  const TABS=useMemo(()=>{
    const ordered=tabOrder.map(id=>DEFAULT_TABS.find(t=>t.id===id)).filter(Boolean);
    // Append any new tabs not yet in order
    DEFAULT_TABS.forEach(t=>{ if(!ordered.find(o=>o.id===t.id)) ordered.push(t); });
    return ordered;
  },[tabOrder]);

  const saveTabOrder=(newOrder)=>{
    setTabOrder(newOrder);
    localStorage.setItem("up_taborder",JSON.stringify(newOrder));
  };

  const moveTab=(from,to)=>{
    const arr=[...tabOrder];
    const [moved]=arr.splice(from,1);
    arr.splice(to,0,moved);
    saveTabOrder(arr);
  };

  const handleUpgrade=()=>{
    const u={...authUser,isPro:true};
    const reg=JSON.parse(localStorage.getItem("up_users")||"{}");
    if(reg[u.email]){reg[u.email].isPro=true;localStorage.setItem("up_users",JSON.stringify(reg));}
    saveAuth(u); setAuthUser(u); setShowUpgrade(false);
  };

  const handleLogout=()=>{clearAuth();setAuthUser(null);setData(null);setAnimIn(false);};

  // AI Coach chat
  const sendChatMessage=useCallback(async()=>{
    if(!chatInput.trim()||chatLoading)return;
    const userMsg={role:"user",content:chatInput.trim(),id:uid()};
    setChatMessages(p=>[...p,userMsg]);
    setChatInput("");
    setChatLoading(true);
    // Build context from user's data
    const ctx=`You are an elite weekly planning coach for ${authUser?.name||"the user"} in the Ultimate Planner app.
Their current data:
- KI Progress: ${overallPct()}% overall (${data?.kis?.length||0} key indicators)
- Life Goals: ${data?.yearlyGoals?.length||0} goals, ${data?.yearlyGoals?.filter(g=>g.progress>=100)?.length||0} completed
- Financial Goals: ${(data?.financialGoals||[]).length} goals
- Reflections: ${(data?.reflections||[]).length} saved
- This week: ${DAYS.reduce((a,day)=>a+(data?.weekDays[day]?.tasks||[]).length,0)} tasks planned, ${DAYS.reduce((a,day)=>a+(data?.weekDays[day]?.tasks||[]).filter(t=>t.done).length,0)} done
- Top goals: ${(data?.yearlyGoals||[]).slice(0,3).map(g=>`${g.title} (${g.progress}%)`).join(", ")||"none yet"}
Be concise, practical, motivating, and specific to their actual data. Max 200 words per response.`;

    try{
      const history=[...chatMessages,userMsg].slice(-10);
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:400,
          system:ctx,
          messages:history.map(m=>({role:m.role,content:m.content}))
        })
      });
      const json=await res.json();
      const reply=json.content?.[0]?.text||"I'm here to help! Try asking about your goals, planning your week, or staying motivated.";
      setChatMessages(p=>[...p,{role:"assistant",content:reply,id:uid()}]);
    }catch(e){
      setChatMessages(p=>[...p,{role:"assistant",content:"I'm having trouble connecting right now. Please try again in a moment!",id:uid()}]);
    }
    setChatLoading(false);
    setTimeout(()=>chatEndRef.current?.scrollIntoView({behavior:"smooth"}),100);
  },[chatInput,chatLoading,chatMessages,data,authUser,overallPct]);

  // KI ops
  const addKI=()=>{
    if(!newKI.name.trim())return;
    if(!isPro&&data.kis.length>=FREE_LIMITS.indicators){goPro();return;}
    upd(p=>({...p,kis:[...p.kis,{...newKI,id:uid(),dailyLogs:{}}]}));
    setNewKI({category:"intellectual",name:"",unit:"times",weeklyGoal:5});
  };
  const delKI=id=>upd(p=>({...p,kis:p.kis.filter(k=>k.id!==id)}));
  const logKI=(id,day,val)=>upd(p=>({...p,kis:p.kis.map(k=>k.id===id?{...k,dailyLogs:{...k.dailyLogs,[day]:Math.max(0,parseFloat(val)||0)}}:k)}));

  // Goal ops
  const saveGoal=()=>{
    if(!newGoal.title.trim())return;
    if(!isPro&&!editGoalId&&data.yearlyGoals.length>=FREE_LIMITS.yearlyGoals){goPro();return;}
    if(editGoalId){
      upd(p=>({...p,yearlyGoals:p.yearlyGoals.map(g=>g.id===editGoalId?{...newGoal,id:editGoalId}:g)}));
      setEditGoalId(null);
    } else {
      upd(p=>({...p,yearlyGoals:[...p.yearlyGoals,{...newGoal,id:uid()}]}));
    }
    setNewGoal({category:"intellectual",title:"",description:"",target:"",progress:0,steps:[],weekSteps:""});
    setShowGoalForm(false);
  };
  const updGoal=(id,field,val)=>upd(p=>({...p,yearlyGoals:p.yearlyGoals.map(g=>g.id===id?{...g,[field]:val}:g)}));
  const addStep=(id,text)=>{ if(!text.trim())return; upd(p=>({...p,yearlyGoals:p.yearlyGoals.map(g=>g.id===id?{...g,steps:[...g.steps,{id:uid(),text,done:false}]}:g)})); };
  const togStep=(gId,sId)=>upd(p=>({...p,yearlyGoals:p.yearlyGoals.map(g=>g.id===gId?{...g,steps:g.steps.map(s=>s.id===sId?{...s,done:!s.done}:s)}:g)}));

  // Financial goal ops
  const FIN_CATS=[
    {id:"savings",label:"Savings",icon:"🏦"},
    {id:"emergency",label:"Emergency Fund",icon:"🛡️"},
    {id:"investment",label:"Investment",icon:"📈"},
    {id:"debt",label:"Debt Payoff",icon:"💳"},
    {id:"purchase",label:"Big Purchase",icon:"🏠"},
    {id:"travel",label:"Travel Fund",icon:"✈️"},
    {id:"education",label:"Education",icon:"🎓"},
    {id:"other",label:"Other",icon:"💼"},
  ];
  const finCatIcon=id=>FIN_CATS.find(c=>c.id===id)?.icon||"💰";
  const finCatLabel=id=>FIN_CATS.find(c=>c.id===id)?.label||"Financial";

  const saveFinGoal=()=>{
    if(!newFinGoal.name.trim()||!newFinGoal.targetAmount)return;
    const fgs=data.financialGoals||[];
    if(!isPro&&!editFinId&&fgs.length>=FREE_LIMITS.financialGoals){goPro();return;}
    if(editFinId){
      upd(p=>({...p,financialGoals:(p.financialGoals||[]).map(g=>g.id===editFinId?{...newFinGoal,id:editFinId}:g)}));
      setEditFinId(null);
    } else {
      upd(p=>({...p,financialGoals:[...(p.financialGoals||[]),{...newFinGoal,id:uid(),deposits:[]}]}));
    }
    setNewFinGoal({name:"",targetAmount:0,saved:0,category:"savings",deadline:"",notes:"",deposits:[]});
    setShowFinForm(false);
  };
  const addDeposit=(id,amount,note)=>{
    if(!amount)return;
    const amt=parseFloat(amount)||0;
    upd(p=>({...p,financialGoals:(p.financialGoals||[]).map(g=>g.id===id?{...g,saved:(g.saved||0)+amt,deposits:[...( g.deposits||[]),{id:uid(),amount:amt,note,date:new Date().toLocaleDateString()}]}:g)}));
  };

  // Task ops
  const selDay=data?.selectedDay||"Monday";
  const addTask=()=>{
    if(!newTask.title.trim()||!data)return;
    const total=DAYS.reduce((a,d)=>a+(data.weekDays[d]?.tasks?.length||0),0);
    if(!isPro&&total>=FREE_LIMITS.weeklyTasks){goPro();return;}
    const taskBase={...newTask,id:uid(),done:false};
    upd(p=>{
      const wd={...p.weekDays};
      if(newTask.repeat==="daily"){
        DAYS.forEach(d=>{ wd[d]={...wd[d],tasks:[...(wd[d]?.tasks||[]),{...taskBase,id:uid()}]}; });
      } else if(newTask.repeat==="weekly"){
        // Add to selected day (recurring marker)
        wd[p.selectedDay]={...wd[p.selectedDay],tasks:[...wd[p.selectedDay].tasks,{...taskBase,recurring:"weekly"}]};
      } else {
        wd[p.selectedDay]={...wd[p.selectedDay],tasks:[...wd[p.selectedDay].tasks,taskBase]};
      }
      return{...p,weekDays:wd};
    });
    setNewTask({time:"9:00 AM",title:"",category:"intellectual",notes:"",repeat:"none",type:"task"});
  };
  const togTask=(day,id)=>upd(p=>{const wd={...p.weekDays};wd[day]={...wd[day],tasks:wd[day].tasks.map(t=>t.id===id?{...t,done:!t.done}:t)};return{...p,weekDays:wd};});
  const delTask=(day,id)=>upd(p=>{const wd={...p.weekDays};wd[day]={...wd[day],tasks:wd[day].tasks.filter(t=>t.id!==id)};return{...p,weekDays:wd};});

  // Calendar event ops
  const addEvent=()=>{
    if(!newEvent.title.trim()||!newEvent.date)return;
    const eventBase={...newEvent,id:uid()};
    upd(p=>{
      const wd={...p.weekDays};
      if(newEvent.repeat==="daily"){
        // Add to all 7 days
        DAYS.forEach(d=>{ wd[d]={...wd[d],events:[...(wd[d]?.events||[]),{...eventBase,id:uid(),recurring:"daily"}]}; });
      } else if(newEvent.repeat==="weekly"){
        // Add to only the chosen day, mark recurring
        const dayName=new Date(newEvent.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"});
        if(wd[dayName]){
          wd[dayName]={...wd[dayName],events:[...(wd[dayName].events||[]),{...eventBase,recurring:"weekly"}]};
        }
      } else if(newEvent.repeat==="monthly"){
        // Add to this day + same weekday 2 weeks out (simulate monthly within week view)
        const dayName=new Date(newEvent.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"});
        if(wd[dayName]){
          wd[dayName]={...wd[dayName],events:[...(wd[dayName].events||[]),{...eventBase,recurring:"monthly"}]};
        }
      } else {
        const dayName=new Date(newEvent.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"});
        if(wd[dayName]){
          wd[dayName]={...wd[dayName],events:[...(wd[dayName].events||[]),eventBase]};
        }
      }
      return{...p,weekDays:wd};
    });
    setNewEvent({title:"",date:"",startTime:"9:00 AM",endTime:"10:00 AM",type:"work",notes:"",color:"#4f9cf9",repeat:"none"});
    setShowEventForm(false);
  };
  const delEvent=(day,id)=>upd(p=>{const wd={...p.weekDays};wd[day]={...wd[day],events:(wd[day].events||[]).filter(e=>e.id!==id)};return{...p,weekDays:wd};});

  // Calendar sync simulation
  const exportItems=useMemo(()=>{
    if(!data)return[];
    const items=[];
    // Weekly tasks
    DAYS.forEach((day,i)=>{ (data.weekDays[day]?.tasks||[]).forEach(t=>{
      items.push({id:t.id,title:t.title,day,date:dayDate(i),time:t.time||"9:00 AM",category:t.category,desc:t.notes||"",type:"task",done:t.done});
    });});
    // Goal weekly steps — placed on Monday
    data.yearlyGoals.forEach(g=>{
      if(g.weekSteps&&g.weekSteps.trim()){
        items.push({id:g.id+"_ws",title:`🎯 ${g.title}: ${g.weekSteps}`,day:"Monday",date:dayDate(0),time:"8:00 AM",category:g.category,desc:`Goal: ${g.description||g.title} (${g.progress}% complete)`,type:"goal"});
      }
      // Also add any uncompleted milestone steps
      (g.steps||[]).filter(s=>!s.done).slice(0,2).forEach((s,i)=>{
        items.push({id:g.id+"_ms_"+s.id,title:`📌 [${g.title}] ${s.text}`,day:DAYS[Math.min(i+1,6)],date:dayDate(Math.min(i+1,6)),time:"10:00 AM",category:g.category,desc:`Milestone for: ${g.title}`,type:"goal"});
      });
    });
    // Financial goal deadlines
    (data.financialGoals||[]).forEach(g=>{
      if(g.deadline&&g.deadline.trim()){
        const dDate=new Date(g.deadline);
        if(!isNaN(dDate)){
          const remaining=g.targetAmount-(g.saved||0);
          items.push({id:g.id+"_fin",title:`💰 ${g.name} — Funding Deadline`,day:"Monday",date:dDate,time:"9:00 AM",category:"financial",desc:`Target: ${fmt$(g.targetAmount)} · Saved: ${fmt$(g.saved||0)} · Remaining: ${fmt$(remaining>0?remaining:0)}`,type:"financial"});
        }
      }
    });
    // Calendar events from weekly days
    DAYS.forEach((day,i)=>{ (data.weekDays[day]?.events||[]).forEach(ev=>{
      items.push({id:ev.id,title:ev.title,day,date:dayDate(i),time:ev.startTime||"9:00 AM",category:ev.type||"work",desc:ev.notes||"",type:"event",endTime:ev.endTime});
    });});
    return items;
  },[data]);

  // Build ICS content
  const toICS=useCallback((events)=>{
    const esc=s=>(s||"").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n");
    const fmtDT=dt=>{
      if(!dt||isNaN(dt.getTime()))return null;
      return `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
    };
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//WeeklyPlannerPro//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
    events.forEach(ev=>{
      const dtStart=fmtDT(ev.dtstart); const dtEnd=fmtDT(ev.dtend);
      if(!dtStart)return;
      lines.push("BEGIN:VEVENT",`UID:${ev.uid}@weeklyplannerpro`,`DTSTAMP:${fmtDT(new Date())}`,`DTSTART:${dtStart}`,`DTEND:${dtEnd||dtStart}`,`SUMMARY:${esc(ev.title)}`,`DESCRIPTION:${esc(ev.desc)}`,`CATEGORIES:${esc(ev.category)}`,"END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  },[]);

  const simulateCalSync=()=>{
    if(!isPro){goPro();return;}
    setCalSyncStatus("syncing");
    setTimeout(()=>{
      upd(p=>({...p,calendarConnected:true,calendarEvents:exportItems.map(i=>({...i,synced:true,syncedAt:new Date().toISOString()}))}));
      setCalSyncStatus("synced");
      setTimeout(()=>setCalSyncStatus("idle"),3500);
    },2200);
  };

  const downloadICS=()=>{
    const sel=exportItems.filter(i=>calSel[i.id]);
    if(!sel.length)return;
    const parseTime=(tStr,baseDate)=>{
      const s=new Date(baseDate); if(!tStr){s.setHours(9,0,0);return s;}
      const isPM=tStr.toUpperCase().includes("PM");
      const [hRaw,mRaw]=(tStr.replace(/\s*(AM|PM)/i,"")).split(":").map(Number);
      const h=isPM&&hRaw!==12?hRaw+12:(!isPM&&hRaw===12?0:hRaw);
      s.setHours(h,mRaw||0,0,0); return s;
    };
    const events=sel.map(item=>{
      const s=parseTime(item.time,item.date);
      const e=new Date(s); e.setHours(s.getHours()+1);
      return{uid:item.id,title:item.title,dtstart:s,dtend:e,desc:item.desc,category:CATS.find(c=>c.id===item.category)?.label||item.category};
    });
    const blob=new Blob([toICS(events)],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="weekly-plan.ics";a.click();
    URL.revokeObjectURL(url);
  };

  if(!authUser)return <AuthScreen onAuth={u=>setAuthUser(u)}/>;
  if(!data)return <div style={{minHeight:"100vh",background:"#08090d",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'DM Sans',sans-serif"}}>Loading…</div>;

  const earned=data.earnedAchievements||[];
  const q=QUOTES[new Date().getDay()%QUOTES.length];

  // Style tokens
  const S={
    card:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:24},
    title:{fontFamily:"'Syne',serif",fontSize:19,color:"#fff",margin:"0 0 4px",fontWeight:700},
    sub:{fontSize:12,color:"rgba(255,255,255,0.35)",margin:"0 0 18px"},
    inp:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,color:"#f0ece4",padding:"10px 13px",fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box"},
    sel:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,color:"#f0ece4",padding:"10px 13px",fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none"},
    btn:(bg,fg="#fff")=>({background:bg||"#4f9cf9",border:"none",color:fg,padding:"10px 20px",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}),
    lbl:{fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:"1.5px",textTransform:"uppercase",display:"block",marginBottom:6},
  };

  // ────────────────────────────────────────────────────────────────
  //  DASHBOARD
  // ────────────────────────────────────────────────────────────────
  const renderDashboard=()=>{
    const finGoals=data.financialGoals||[];
    const totalSaved=finGoals.reduce((a,g)=>a+(g.saved||0),0);
    const totalTarget=finGoals.reduce((a,g)=>a+(g.targetAmount||0),0);
    const finPct=totalTarget>0?Math.round(totalSaved/totalTarget*100):0;
    const earnedCount=earned.length;
    const totalAch=ACHIEVEMENTS.length;
    return(
      <div>
        <div style={{marginBottom:26}}>
          <h1 style={{...S.title,fontSize:26,margin:"0 0 4px"}}>{new Date().getHours()<12?"Good morning":new Date().getHours()<17?"Good afternoon":"Good evening"}, {authUser.name.split(" ")[0]} 👋</h1>
          <p style={{margin:0,color:"rgba(255,255,255,0.35)",fontSize:13,fontStyle:"italic"}}>"{q}"</p>
        </div>

        {/* Stat bar */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:18}}>
          <div style={{...S.card,display:"flex",alignItems:"center",gap:16}}>
            <Ring pct={overallPct()} size={60} stroke={5} color="#4f9cf9"/>
            <div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:2}}>Weekly KI</div>
              <div style={{fontSize:20,fontWeight:700,color:"#fff"}}>{overallPct()}%</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{data.kis.length} indicators</div>
            </div>
          </div>
          {CATS.map(cat=>(
            <div key={cat.id} style={{...S.card,borderLeft:`3px solid ${cat.color}`,padding:"16px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                <div><div style={{fontSize:18,marginBottom:2}}>{cat.icon}</div><div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{cat.label}</div></div>
                <div style={{fontSize:20,fontWeight:700,color:cat.color}}>{cat.id==="financial"?`${finPct}%`:catPct(cat.id)+"%"}</div>
              </div>
              <Bar pct={cat.id==="financial"?finPct:catPct(cat.id)} color={cat.color}/>
            </div>
          ))}
          {/* Achievements mini */}
          <div style={{...S.card,borderLeft:"3px solid #fbbf24",padding:"16px 18px",cursor:"pointer"}} onClick={()=>setTab("achievements")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
              <div><div style={{fontSize:18,marginBottom:2}}>🏅</div><div style={{fontSize:13,fontWeight:600,color:"#fff"}}>Medals</div></div>
              <div style={{fontSize:20,fontWeight:700,color:"#fbbf24"}}>{earnedCount}/{totalAch}</div>
            </div>
            <Bar pct={Math.round(earnedCount/totalAch*100)} color="#fbbf24"/>
          </div>
        </div>


        {/* Today's Schedule */}
        {(()=>{
          const now=new Date();
          const todayName=DAYS[(now.getDay()+6)%7];
          const dayData=data.weekDays[todayName]||{};
          const parseTime2=(ts)=>{
            if(!ts)return null;
            const [tp,ap]=(ts+" ").split(" ");
            let [hh,mm]=(tp||"0:00").split(":").map(Number);
            if(ap==="PM"&&hh!==12)hh+=12;
            if(ap==="AM"&&hh===12)hh=0;
            const t=new Date(now); t.setHours(hh,mm||0,0,0); return t;
          };
          const allToday=[
            ...(dayData.tasks||[]).map(t=>({...t,kind:"task",timeStr:t.time,label:t.title})),
            ...(dayData.events||[]).map(e=>({...e,kind:"event",timeStr:e.startTime,label:e.title})),
            ...((data.routines?.morning||[]).map(r=>({...r,kind:"routine",timeStr:r.time,label:r.title}))),
            ...((data.routines?.evening||[]).map(r=>({...r,kind:"routine",timeStr:r.time,label:r.title}))),
          ].filter(x=>x.timeStr).sort((a,b)=>(parseTime2(a.timeStr)||0)-(parseTime2(b.timeStr)||0));
          if(!allToday.length)return null;
          const nextUp=allToday.find(x=>{
            const t=parseTime2(x.timeStr); return t&&(t-now)>=-120000;
          });
          const kindColors={task:"#4f9cf9",event:"#c084fc",routine:"#fbbf24"};
          return(
            <div style={{...S.card,marginBottom:16,borderLeft:"3px solid #34c98a"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <p style={{...S.title,fontSize:16,margin:0}}>📅 Today — {todayName}</p>
                <button onClick={()=>setTab("weekly")} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>Full plan →</button>
              </div>
              {nextUp&&<div style={{background:"rgba(52,201,138,0.08)",borderRadius:8,padding:"8px 12px",marginBottom:10,border:"1px solid rgba(52,201,138,0.2)",display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:14}}>⏭️</span><div><div style={{fontSize:11,color:"#34c98a",fontWeight:700}}>NEXT UP</div><div style={{fontSize:13,color:"#fff"}}>{nextUp.label} <span style={{color:"rgba(255,255,255,0.4)",fontSize:11}}>at {nextUp.timeStr}</span></div></div></div>}
              <div style={{maxHeight:200,overflowY:"auto"}}>
                {allToday.slice(0,8).map((x,i)=>{
                  const isPast=(parseTime2(x.timeStr)||0)<now;
                  const isNext=nextUp&&x.id===nextUp.id;
                  return(
                    <div key={x.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:7,marginBottom:4,opacity:isPast?0.45:1,background:isNext?"rgba(52,201,138,0.06)":"transparent"}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:kindColors[x.kind]||"#4f9cf9",flexShrink:0,display:"inline-block"}}></span>
                      <span style={{fontSize:11,color:"rgba(255,255,255,0.35)",minWidth:50,flexShrink:0}}>{x.timeStr}</span>
                      <span style={{fontSize:12,color:isPast?"rgba(255,255,255,0.3)":"#f0ece4",flex:1,textDecoration:isPast&&x.done?"line-through":"none"}}>{x.label}</span>
                      <span style={{fontSize:9,color:kindColors[x.kind],background:`${kindColors[x.kind]}15`,borderRadius:4,padding:"1px 5px",textTransform:"uppercase"}}>{x.kind}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {/* Recent achievements */}
        {earned.length>0&&(
          <div style={{...S.card,marginBottom:16}}>
            <p style={{...S.title,fontSize:16}}>Recent Medals</p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {ACHIEVEMENTS.filter(a=>earned.includes(a.id)).slice(-5).reverse().map(a=>{
                const tc=TIER_COLORS[a.tier];
                return(
                  <div key={a.id} style={{display:"flex",alignItems:"center",gap:7,background:tc.bg,border:`1px solid ${tc.border}`,borderRadius:10,padding:"8px 12px",boxShadow:`0 0 10px ${tc.glow}`}}>
                    <span style={{fontSize:18}}>{a.icon}</span>
                    <div><div style={{fontSize:12,fontWeight:700,color:tc.text}}>{a.title}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"1px"}}>{a.tier}</div></div>
                  </div>
                );
              })}
              <button onClick={()=>setTab("achievements")} style={{...S.btn("rgba(255,255,255,0.06)"),fontSize:12,padding:"8px 14px"}}>View all →</button>
            </div>
          </div>
        )}

        {/* Financial summary */}
        {finGoals.length>0&&(
          <div style={{...S.card,marginBottom:16,borderLeft:"3px solid #fbbf24"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <p style={{...S.title,fontSize:16,margin:0}}>💰 Financial Goals</p>
              <span style={{fontSize:14,fontWeight:700,color:"#fbbf24"}}>{fmt$(totalSaved)} / {fmt$(totalTarget)}</span>
            </div>
            <Bar pct={finPct} color="#fbbf24" h={8}/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginTop:14}}>
              {finGoals.slice(0,4).map(g=>{
                const pct=g.targetAmount>0?Math.min((g.saved||0)/g.targetAmount*100,100):0;
                return(
                  <div key={g.id} style={{background:"rgba(251,191,36,0.06)",borderRadius:10,padding:"12px 14px",border:"1px solid rgba(251,191,36,0.15)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{finCatIcon(g.category)} {g.name}</div>
                      <span style={{fontSize:12,fontWeight:700,color:"#fbbf24"}}>{Math.round(pct)}%</span>
                    </div>
                    <Bar pct={pct} color="#fbbf24" h={4}/>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:4}}>{fmt$(g.saved||0)} of {fmt$(g.targetAmount)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week grid */}
        <div style={S.card}>
          <p style={{...S.title,fontSize:16,marginBottom:14}}>This Week at a Glance</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
            {DAYS.map((day,i)=>{
              const tasks=data.weekDays[day]?.tasks||[];
              const done=tasks.filter(t=>t.done).length;
              return(
                <div key={day} onClick={()=>{upd(p=>({...p,selectedDay:day}));setTab("weekly");}}
                  style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"12px 6px",textAlign:"center",cursor:"pointer",border:"1px solid rgba(255,255,255,0.05)",transition:"background 0.15s"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:4}}>{day.slice(0,3).toUpperCase()}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.2)",marginBottom:6}}>{dayDate(i).toLocaleDateString("en",{month:"short",day:"numeric"})}</div>
                  <div style={{fontSize:20,fontWeight:700,color:tasks.length?"#fff":"rgba(255,255,255,0.15)"}}>{tasks.length}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginBottom:4}}>{done}/{tasks.length}</div>
                  {tasks.length>0&&<Bar pct={tasks.length?done/tasks.length*100:0} color="#4f9cf9" h={3}/>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notification Permission Banner */}
        {typeof Notification!=="undefined"&&notifPermission!=="granted"&&(
          <div style={{background:"rgba(79,156,249,0.07)",border:"1px solid rgba(79,156,249,0.25)",borderRadius:14,padding:"16px 20px",marginTop:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <span style={{fontSize:28}}>🔔</span>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#4f9cf9",marginBottom:3}}>Enable Smart Daily Reminders</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.6}}>
                    Get notified <strong style={{color:"rgba(255,255,255,0.7)"}}>30 min & 15 min before</strong> every task, event, and routine step throughout your day. Also get <strong style={{color:"rgba(255,255,255,0.7)"}}>schedule summaries</strong> at 7am, 9am, 12pm, 3pm, and 7pm.
                  </div>
                </div>
              </div>
              <button onClick={()=>{
                Notification.requestPermission().then(p=>{
                  setNotifPermission(p);
                  if(p==="granted") setToasts(t=>[...t,{id:uid(),icon:"🔔",title:"Notifications enabled! You'll stay on track all day."}]);
                });
              }} style={{background:"linear-gradient(135deg,#4f9cf9,#3b7de8)",border:"none",color:"#fff",borderRadius:10,padding:"11px 20px",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",flexShrink:0}}>
                🔔 Enable Notifications
              </button>
            </div>
          </div>
        )}
        {notifPermission==="granted"&&(
          <div style={{background:"rgba(52,201,138,0.06)",border:"1px solid rgba(52,201,138,0.2)",borderRadius:14,padding:"14px 20px",marginTop:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:18}}>✅</span>
              <span style={{fontSize:13,fontWeight:700,color:"#34c98a"}}>Smart Notifications Active</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
              {[
                {icon:"⏰",t:"30 min before each task"},
                {icon:"🔔",t:"15 min final reminder"},
                {icon:"🟢",t:"Exact-time alerts"},
                {icon:"📋",t:"Schedule summaries at 7am, 9am, 12pm, 3pm & 7pm"},
              ].map((x,i)=>(
                <div key={i} style={{display:"flex",gap:7,alignItems:"center",fontSize:12,color:"rgba(255,255,255,0.5)"}}>
                  <span>{x.icon}</span><span>{x.t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Planning Wizard */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginTop:14}}>
          <div style={{...S.card,borderLeft:"3px solid #4f9cf9",cursor:"pointer",transition:"transform 0.2s"}} onClick={()=>{setPlanningWizardMode("plan");setPlanningWizardStep(1);setWizardGoalIdx(0);}}>
            <div style={{fontSize:28,marginBottom:8}}>🗓️</div>
            <div style={{fontFamily:"'Syne',serif",fontSize:17,fontWeight:700,color:"#fff",marginBottom:4}}>Plan Your Week</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.5,marginBottom:14}}>Walk through each goal step-by-step and set your focus for the coming week.</div>
            <button style={{...S.btn("#4f9cf9"),fontSize:13,padding:"9px 18px"}}>Start Planning →</button>
          </div>
          <div style={{...S.card,borderLeft:"3px solid #34c98a",cursor:"pointer"}} onClick={()=>{setPlanningWizardMode("review");setPlanningWizardStep(1);setWizardGoalIdx(0);}}>
            <div style={{fontSize:28,marginBottom:8}}>📋</div>
            <div style={{fontFamily:"'Syne',serif",fontSize:17,fontWeight:700,color:"#fff",marginBottom:4}}>Review Your Week</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.5,marginBottom:14}}>Review each goal's progress and write your end-of-week reflection.</div>
            <button style={{...S.btn("#34c98a"),fontSize:13,padding:"9px 18px"}}>Start Review →</button>
          </div>
          {/* Pro Daily Planner */}
          <div style={{...S.card,borderLeft:"3px solid #fbbf24",cursor:"pointer",position:"relative",overflow:"hidden"}} onClick={()=>{if(!isPro){goPro();return;}setDailyPlannerDay(0);setShowDailyPlanner(true);upd(p=>({...p,achievementStats:{...p.achievementStats,proWizardUsed:(p.achievementStats?.proWizardUsed||0)+1}}));}}>
            {!isPro&&<div style={{position:"absolute",top:8,right:8,background:"rgba(251,191,36,0.15)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:6,padding:"2px 7px",fontSize:9,fontWeight:800,color:"#fbbf24"}}>PRO</div>}
            <div style={{fontSize:28,marginBottom:8}}>📆</div>
            <div style={{fontFamily:"'Syne',serif",fontSize:17,fontWeight:700,color:"#fff",marginBottom:4}}>Daily Planner <span style={{color:"#fbbf24"}}>★</span></div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.5,marginBottom:14}}>Plan each day of the week — tasks, events, and repeating commitments — all in one focused flow.</div>
            <button style={{...S.btn("#fbbf24","#000"),fontSize:13,padding:"9px 18px"}}>{isPro?"Open Daily Planner →":"Upgrade to Unlock"}</button>
          </div>
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  FINANCIAL GOALS
  // ────────────────────────────────────────────────────────────────
  const renderFinancial=()=>{
    const fgs=data.financialGoals||[];
    const totalSaved=fgs.reduce((a,g)=>a+(g.saved||0),0);
    const totalTarget=fgs.reduce((a,g)=>a+(g.targetAmount||0),0);
    return(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div>
            <h2 style={{...S.title,fontSize:22,margin:0}}>💰 Financial Goals</h2>
            <p style={{margin:"4px 0 0",color:"rgba(255,255,255,0.35)",fontSize:13}}>Track savings, debt payoff, investments & big purchases.</p>
          </div>
          <button onClick={()=>{setShowFinForm(true);setEditFinId(null);setNewFinGoal({name:"",targetAmount:0,saved:0,category:"savings",deadline:"",notes:"",deposits:[]});}}
            style={S.btn("#fbbf24","#000")}>+ Add Financial Goal</button>
        </div>

        {!isPro&&fgs.length>=FREE_LIMITS.financialGoals&&(
          <div style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:12,padding:"12px 18px",marginBottom:18,fontSize:13,color:"#fbbf24",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Free plan: 1 financial goal. Upgrade for unlimited.</span>
            <button onClick={goPro} style={{...S.btn("#fbbf24","#000"),fontSize:12,padding:"6px 14px"}}>Upgrade</button>
          </div>
        )}

        {/* Summary bar */}
        {fgs.length>0&&(
          <div style={{...S.card,marginBottom:22,background:"rgba(251,191,36,0.06)",borderColor:"rgba(251,191,36,0.2)"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,textAlign:"center"}}>
              <div><div style={{fontSize:24,fontWeight:800,color:"#fbbf24"}}>{fmt$(totalSaved)}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Total Saved</div></div>
              <div><div style={{fontSize:24,fontWeight:800,color:"#fff"}}>{fmt$(totalTarget)}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Total Target</div></div>
              <div><div style={{fontSize:24,fontWeight:800,color:"#34c98a"}}>{fmt$(totalTarget-totalSaved)}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Remaining</div></div>
            </div>
            <div style={{marginTop:14}}><Bar pct={totalTarget>0?Math.round(totalSaved/totalTarget*100):0} color="#fbbf24" h={10}/></div>
          </div>
        )}

        {/* Add form */}
        {showFinForm&&(
          <div style={{...S.card,marginBottom:22,borderColor:"rgba(251,191,36,0.3)",background:"rgba(251,191,36,0.05)"}}>
            <p style={{...S.title,marginBottom:16}}>{editFinId?"Edit Financial Goal":"New Financial Goal"}</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={S.lbl}>Goal Name</label><input placeholder="e.g. Emergency Fund, New Car" value={newFinGoal.name} onChange={e=>setNewFinGoal(p=>({...p,name:e.target.value}))} style={S.inp}/></div>
              <div><label style={S.lbl}>Category</label>
                <select value={newFinGoal.category} onChange={e=>setNewFinGoal(p=>({...p,category:e.target.value}))} style={{...S.sel,width:"100%"}}>
                  {FIN_CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={S.lbl}>Target Amount ($)</label><input type="number" placeholder="10000" value={newFinGoal.targetAmount||""} onChange={e=>setNewFinGoal(p=>({...p,targetAmount:parseFloat(e.target.value)||0}))} style={S.inp}/></div>
              <div><label style={S.lbl}>Already Saved ($)</label><input type="number" placeholder="0" value={newFinGoal.saved||""} onChange={e=>setNewFinGoal(p=>({...p,saved:parseFloat(e.target.value)||0}))} style={S.inp}/></div>
              <div><label style={S.lbl}>Target Date</label><input type="date" value={newFinGoal.deadline} onChange={e=>setNewFinGoal(p=>({...p,deadline:e.target.value}))} style={S.inp}/></div>
            </div>
            <div style={{marginBottom:14}}><label style={S.lbl}>Notes</label><textarea placeholder="Why is this goal important?" value={newFinGoal.notes} onChange={e=>setNewFinGoal(p=>({...p,notes:e.target.value}))} style={{...S.inp,minHeight:60,resize:"vertical",lineHeight:1.6}}/></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={saveFinGoal} style={S.btn("#fbbf24","#000")}>{editFinId?"Save Changes":"Add Goal"}</button>
              <button onClick={()=>setShowFinForm(false)} style={S.btn("rgba(255,255,255,0.1)")}>Cancel</button>
            </div>
          </div>
        )}

        {/* Goal cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:18}}>
          {fgs.map(g=>{
            const pct=g.targetAmount>0?Math.min((g.saved||0)/g.targetAmount*100,100):0;
            const remaining=Math.max((g.targetAmount||0)-(g.saved||0),0);
            const isComplete=pct>=100;
            return(
              <div key={g.id} style={{...S.card,borderLeft:`4px solid ${isComplete?"#34c98a":"#fbbf24"}`,position:"relative",overflow:"hidden"}}>
                {isComplete&&<div style={{position:"absolute",top:0,right:0,background:"#34c98a",color:"#000",fontSize:11,fontWeight:800,padding:"4px 12px",borderRadius:"0 16px 0 12px"}}>COMPLETE ✓</div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div>
                    <div style={{fontSize:22,marginBottom:4}}>{finCatIcon(g.category)}</div>
                    <div style={{fontFamily:"'Syne',serif",fontSize:16,color:"#fff",fontWeight:700}}>{g.name}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2}}>{finCatLabel(g.category)}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{setNewFinGoal({...g});setEditFinId(g.id);setShowFinForm(true);}} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:14}}>✎</button>
                    <button onClick={()=>upd(p=>({...p,financialGoals:(p.financialGoals||[]).filter(x=>x.id!==g.id)}))} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:14}}>✕</button>
                  </div>
                </div>

                {/* Amount display */}
                <div style={{background:"rgba(251,191,36,0.06)",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center",marginBottom:10}}>
                    <div><div style={{fontSize:18,fontWeight:800,color:"#fbbf24"}}>{fmt$(g.saved||0)}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Saved</div></div>
                    <div><div style={{fontSize:18,fontWeight:800,color:"#fff"}}>{fmt$(g.targetAmount)}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Target</div></div>
                    <div><div style={{fontSize:18,fontWeight:800,color:isComplete?"#34c98a":"#f97b4f"}}>{isComplete?"🎉":fmt$(remaining)}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Remaining</div></div>
                  </div>
                  <Bar pct={pct} color={isComplete?"#34c98a":"#fbbf24"} h={8}/>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:11,color:"rgba(255,255,255,0.4)"}}>
                    <span>{Math.round(pct)}% funded</span>
                    {g.deadline&&<span>Due: {new Date(g.deadline).toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"})}</span>}
                  </div>
                </div>

                {/* Add deposit */}
                {!isComplete&&(
                  <div style={{marginBottom:14}}>
                    <label style={{...S.lbl,color:"#fbbf24"}}>Add Deposit</label>
                    <div style={{display:"flex",gap:8}}>
                      <input type="number" placeholder="Amount $" value={depositInput[g.id]?.amount||""}
                        onChange={e=>setDepositInput(p=>({...p,[g.id]:{...p[g.id],amount:e.target.value}}))}
                        style={{...S.inp,flex:1}}/>
                      <input placeholder="Note (optional)" value={depositInput[g.id]?.note||""}
                        onChange={e=>setDepositInput(p=>({...p,[g.id]:{...p[g.id],note:e.target.value}}))}
                        style={{...S.inp,flex:2}}/>
                      <button onClick={()=>{addDeposit(g.id,depositInput[g.id]?.amount,depositInput[g.id]?.note||"");setDepositInput(p=>({...p,[g.id]:{amount:"",note:""}}));}}
                        style={{...S.btn("#fbbf24","#000"),padding:"10px 14px",fontWeight:800}}>+</button>
                    </div>
                  </div>
                )}

                {/* Deposit history */}
                {(g.deposits||[]).length>0&&(
                  <div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8}}>Deposit History</div>
                    <div style={{maxHeight:130,overflow:"auto"}}>
                      {[...(g.deposits||[])].reverse().map(dep=>(
                        <div key={dep.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"rgba(255,255,255,0.03)",borderRadius:7,marginBottom:4}}>
                          <div>
                            <span style={{fontSize:13,fontWeight:600,color:"#34c98a"}}>+{fmt$(dep.amount)}</span>
                            {dep.note&&<span style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginLeft:8}}>{dep.note}</span>}
                          </div>
                          <span style={{fontSize:11,color:"rgba(255,255,255,0.25)"}}>{dep.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {g.notes&&<div style={{marginTop:12,fontSize:12,color:"rgba(255,255,255,0.4)",fontStyle:"italic",borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:10}}>{g.notes}</div>}
              </div>
            );
          })}
          {!fgs.length&&(
            <div style={{...S.card,textAlign:"center",padding:48,color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>
              No financial goals yet.<br/>Click "+ Add Financial Goal" to start tracking your money.
            </div>
          )}
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  ACHIEVEMENTS
  // ────────────────────────────────────────────────────────────────
  const renderAchievements=()=>{
    const byTier=t=>ACHIEVEMENTS.filter(a=>a.tier===t);
    const earnedByTier=t=>earned.filter(id=>ACHIEVEMENTS.find(a=>a.id===id)?.tier===t).length;
    const earnedCount=earned.length;

    const GROUPS = [
      { label:"🚀 Getting Started",   ids:["first_login","first_ki","first_goal","first_task","first_reflection","first_fin_goal","first_milestone","first_deposit","first_day_notes","first_week_step","complete_task","profile_complete","just_started"] },
      { label:"📊 Key Indicators",    ids:["ki_log_day","ki_full_week","ki_hit_goal","ki_3logs","ki_all_logged","ki_goal_20","three_kis","ki_5_indicators","ki_all_met","two_ki_goals_met","three_ki_goals_met","ki_week_50","ki_week_80","ki_perfect","ki_2streak","ki_3streak","ki_5streak","ki_8streak","ki_12streak","ki_obsessed"] },
      { label:"🎯 Life Goals",        ids:["two_goals","goal_10","goal_25","goal_50","goal_75","goal_100","goals_2done","goals_3done","goals_5set","goals_10set","goal_rich","goal_described","goal_deadline","goal_added_step","first_milestone","five_milestones","milestone_5","milestone_done","milestones_10done","first_week_step","weekly_step_5","goals_half_done"] },
      { label:"📅 Weekly Planning",   ids:["five_tasks","ten_tasks_planned","monday_task","friday_task","weekend_plan","full_week_planned","task_with_notes","three_categories","all_cats_tasks","early_bird","night_owl","three_done_tasks","five_done_tasks","tasks_5done","tasks_10done","tasks_25done","tasks_50done","day_complete","planner_fanatic","all_tasks_done_week","hundred_club"] },
      { label:"💰 Financial",         ids:["first_fin_goal","two_fin_goals","fin_goal_noted","fin_deadline","fin_first_deposit","fin_3deposits","fin_10deposits","deposit_weekly","fin_save_100","fin_save_250","fin_save_500","fin_save_1k","fin_save_2500","total_saved_1k","fin_save_5k","fin_save_10k","fin_25pct","fin_goal_50pct","fin_75pct","fin_goal_done","fin_2done","fin_3done","fin_5goals","fin_emergency","fin_invest","fin_debt","finance_diverse","fin_goals"] },
      { label:"🧠 Intellectual",      ids:["intel_ki","intel_goal","intel_task","intel_ki_streak"] },
      { label:"🤝 Social",            ids:["social_ki","social_goal","social_task","social_ki_streak"] },
      { label:"💪 Physical",          ids:["phys_ki","phys_goal","phys_task","phys_ki_streak","phys_weekend"] },
      { label:"✨ Spiritual",         ids:["spirit_ki","spirit_goal","spirit_task","spirit_ki_streak","spirit_morning"] },
      { label:"🪞 Reflection",        ids:["two_reflections","reflect_3","reflect_wentwell","reflect_improve","reflect_commit","reflect_2","reflect_5","reflect_10","reflect_20","reflect_52","reflect_highrate","reflect_comeback","reflect_allcats","reflect_rate5"] },
      { label:"🌈 All-Around",        ids:["all_cats_ki","all_cats_goals","notes_writer","cal_sync","grand_slam","dedicated","medal_collector","overachiever"] },
      { label:"💚 Emerald — Pro & Streaks", ids:["pro_member","login_streak_3","login_streak_7","login_streak_14","login_streak_30","login_streak_60","login_streak_100","login_streak_365","pro_planner","pro_ai_coach","pro_cal_sync","milestone_gate_1","calorie_calc_used"] },
    ];

    // "Next to earn" — uneearned medals sorted by tier difficulty (bronze first)
    const tierOrder = { bronze:0, silver:1, gold:2, platinum:3, emerald:4 };
    const nextUp = ACHIEVEMENTS
      .filter(a=>!earned.includes(a.id))
      .sort((a,b)=>tierOrder[a.tier]-tierOrder[b.tier])
      .slice(0,6);

    return(
      <div>
        {/* Header stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:22}}>
          <div style={{...S.card,textAlign:"center",background:"rgba(251,191,36,0.07)",borderColor:"rgba(251,191,36,0.2)"}}>
            <div style={{fontSize:34,fontWeight:800,color:"#fbbf24"}}>{earnedCount}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Earned</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginBottom:6}}>of {ACHIEVEMENTS.length} medals</div>
            <Bar pct={Math.round(earnedCount/ACHIEVEMENTS.length*100)} color="#fbbf24" h={4}/>
          </div>
          {["platinum","gold","silver","bronze","emerald"].map(t=>{
            const tc=TIER_COLORS[t]; const tot=byTier(t).length; const got=earnedByTier(t);
            return(
              <div key={t} style={{...S.card,textAlign:"center",background:tc.bg,borderColor:tc.border}}>
                <div style={{fontSize:26,fontWeight:800,color:tc.text}}>{got}</div>
                <div style={{fontSize:11,color:tc.text,textTransform:"capitalize",fontWeight:600,marginBottom:2}}>{t==="platinum"?"💎":t==="gold"?"🥇":t==="silver"?"🥈":t==="emerald"?"💚":"🥉"} {t}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:6}}>of {tot}</div>
                <Bar pct={tot?got/tot*100:0} color={tc.text} h={3}/>
              </div>
            );
          })}
        </div>

        {/* Next to earn */}
        {nextUp.length>0&&(
          <div style={{...S.card,marginBottom:22,borderColor:"rgba(79,156,249,0.2)",background:"rgba(79,156,249,0.04)"}}>
            <p style={{margin:"0 0 14px",fontFamily:"'Syne',serif",fontSize:15,fontWeight:700,color:"#4f9cf9"}}>🎯 Next Medals to Earn</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10}}>
              {nextUp.map(a=>{
                const tc=TIER_COLORS[a.tier];
                return(
                  <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"10px 13px",border:`1px solid ${tc.border}55`}}>
                    <span style={{fontSize:24,filter:"grayscale(0.4)",flexShrink:0}}>{a.icon}</span>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.8)",marginBottom:2}}>{a.title}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{a.desc}</div>
                      <div style={{fontSize:9,color:tc.text,textTransform:"uppercase",letterSpacing:"1px",marginTop:4,fontWeight:700}}>{a.tier}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
          {["all","bronze","silver","gold","platinum","emerald","earned","unearned"].map(t=>{
            const tc=t==="all"||t==="earned"||t==="unearned"
              ?{text:"rgba(255,255,255,0.7)",bg:"rgba(255,255,255,0.07)",border:"rgba(255,255,255,0.18)"}
              :TIER_COLORS[t];
            const isActive=achFilter===t;
            const label = t==="all"?`All (${ACHIEVEMENTS.length})`:t==="earned"?`✓ Earned (${earnedCount})`:t==="unearned"?`🔒 Locked (${ACHIEVEMENTS.length-earnedCount})`:t==="platinum"?`💎 ${earnedByTier(t)}/${byTier(t).length}`:t==="gold"?`🥇 ${earnedByTier(t)}/${byTier(t).length}`:t==="silver"?`🥈 ${earnedByTier(t)}/${byTier(t).length}`:t==="emerald"?`💚 ${earnedByTier(t)}/${byTier(t).length}`:`🥉 ${earnedByTier(t)}/${byTier(t).length}`;
            return(
              <button key={t} onClick={()=>setAchFilter(t)} style={{padding:"7px 14px",border:`1px solid ${isActive?tc.border:"rgba(255,255,255,0.08)"}`,borderRadius:20,background:isActive?tc.bg:"transparent",color:isActive?tc.text:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s",whiteSpace:"nowrap"}}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Filtered flat view */}
        {achFilter!=="all"?(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:11}}>
            {ACHIEVEMENTS
              .filter(a=>
                achFilter==="earned"?earned.includes(a.id):
                achFilter==="unearned"?!earned.includes(a.id):
                a.tier===achFilter
              )
              .map(a=><MedalCard key={a.id} achievement={a} earned={earned.includes(a.id)}/>)}
          </div>
        ):(
          /* Grouped view when showing all */
          GROUPS.map(group=>{
            const groupAchs=ACHIEVEMENTS.filter(a=>group.ids.includes(a.id));
            if(!groupAchs.length)return null;
            const groupEarned=groupAchs.filter(a=>earned.includes(a.id)).length;
            return(
              <div key={group.label} style={{marginBottom:28}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <span style={{fontFamily:"'Syne',serif",fontSize:15,fontWeight:700,color:"#fff"}}>{group.label}</span>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",flexShrink:0}}>{groupEarned}/{groupAchs.length}</span>
                  <div style={{flex:1,height:3,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${groupAchs.length?groupEarned/groupAchs.length*100:0}%`,background:"linear-gradient(90deg,#fbbf24,#34c98a)",transition:"width 0.6s ease"}}/>
                  </div>
                  {groupEarned===groupAchs.length&&groupAchs.length>0&&<span style={{fontSize:12,color:"#34c98a",fontWeight:700}}>✓ Complete!</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(265px,1fr))",gap:10}}>
                  {groupAchs.map(a=><MedalCard key={a.id} achievement={a} earned={earned.includes(a.id)}/>)}
                </div>
              </div>
            );
          })
        )}

        {earnedCount===0&&(
          <div style={{textAlign:"center",padding:"40px 0",color:"rgba(255,255,255,0.3)",fontSize:14,fontStyle:"italic"}}>
            Start using the app to earn your first medal! 🌱
          </div>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  CALENDAR SYNC (PRO)
  // ────────────────────────────────────────────────────────────────
  const renderCalendar=()=>{
    if(!isPro)return<Lock onUpgrade={goPro} msg="Google Calendar Live Sync is a Pro feature. Upgrade to sync all your tasks and goals in real time."/>;
    const filtered=calFilter==="all"?exportItems:exportItems.filter(i=>i.type===calFilter);
    const syncedItems=data.calendarEvents||[];

    return(
      <div>
        {/* Sync panel */}
        <div style={{...S.card,marginBottom:20,borderColor:"rgba(79,156,249,0.25)",background:"rgba(79,156,249,0.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <p style={{...S.title,color:"#4f9cf9",margin:"0 0 4px"}}>🗓️ Google Calendar Live Sync</p>
              <p style={{...S.sub,marginBottom:0}}>Sync your weekly tasks, goal steps, and financial deadlines.</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {data.calendarConnected&&(
                <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(52,201,138,0.12)",border:"1px solid rgba(52,201,138,0.3)",borderRadius:8,padding:"6px 12px"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#34c98a",animation:"pulse 2s infinite"}}/>
                  <span style={{fontSize:12,color:"#34c98a",fontWeight:600}}>Connected</span>
                </div>
              )}
              <button onClick={simulateCalSync} style={{
                ...S.btn(calSyncStatus==="syncing"?"rgba(79,156,249,0.5)":calSyncStatus==="synced"?"#34c98a":"#4f9cf9"),
                display:"flex",alignItems:"center",gap:8,
              }}>
                {calSyncStatus==="syncing"&&<span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>}
                {calSyncStatus==="synced"?"✓ Synced!":calSyncStatus==="syncing"?"Syncing…":"⟳ Sync Now"}
              </button>
            </div>
          </div>

          <div style={{background:"rgba(79,156,249,0.07)",borderRadius:12,padding:"14px 18px",border:"1px solid rgba(79,156,249,0.15)"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#4f9cf9",marginBottom:8}}>How Live Sync Works:</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {["Click 'Sync Now' to push all tasks and goals to Google Calendar","Events update automatically when you add or complete tasks","Financial goal deadlines appear as all-day calendar events","Synced events show a 🗓️ badge in your calendar app"].map((s,i)=>(
                <div key={i} style={{fontSize:12,color:"rgba(255,255,255,0.5)",display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{color:"#4f9cf9",fontWeight:700,flexShrink:0}}>{i+1}.</span>{s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filter & items */}
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {["all","task","goal","financial"].map(f=>(
            <button key={f} onClick={()=>setCalFilter(f)} style={{padding:"7px 14px",border:`1px solid ${calFilter===f?"rgba(79,156,249,0.5)":"rgba(255,255,255,0.08)"}`,borderRadius:20,background:calFilter===f?"rgba(79,156,249,0.12)":"transparent",color:calFilter===f?"#4f9cf9":"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",textTransform:"capitalize"}}>
              {f==="all"?"All Items":f==="task"?"Weekly Tasks":f==="goal"?"Goal Steps":"Financial"}
            </button>
          ))}
          <button onClick={()=>{const m={};exportItems.forEach(i=>{m[i.id]=true;});setCalSel(m);}} style={{...S.btn("rgba(255,255,255,0.07)"),fontSize:12,padding:"7px 14px"}}>Select All</button>
          <button onClick={()=>setCalSel({})} style={{...S.btn("rgba(255,255,255,0.05)"),fontSize:12,padding:"7px 14px"}}>Clear</button>
        </div>

        <div style={S.card}>
          {filtered.length===0
            ?<div style={{textAlign:"center",padding:"32px 0",color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>No items to sync. Add tasks, goal steps, or financial deadlines first.</div>
            :filtered.map(item=>{
              const isSynced=syncedItems.some(s=>s.id===item.id);
              return(
                <div key={item.id} onClick={()=>setCalSel(p=>({...p,[item.id]:!p[item.id]}))}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:11,cursor:"pointer",marginBottom:7,
                    background:calSel[item.id]?"rgba(79,156,249,0.1)":"rgba(255,255,255,0.03)",
                    border:`1px solid ${calSel[item.id]?"rgba(79,156,249,0.4)":"rgba(255,255,255,0.06)"}`,transition:"all 0.15s"}}>
                  <div style={{width:17,height:17,borderRadius:4,flexShrink:0,border:`2px solid ${calSel[item.id]?"#4f9cf9":"rgba(255,255,255,0.2)"}`,background:calSel[item.id]?"#4f9cf9":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {calSel[item.id]&&<span style={{color:"#000",fontSize:10}}>✓</span>}
                  </div>
                  <span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:item.type==="task"?"rgba(79,156,249,0.12)":item.type==="goal"?"rgba(52,201,138,0.12)":"rgba(251,191,36,0.12)",color:item.type==="task"?"#4f9cf9":item.type==="goal"?"#34c98a":"#fbbf24",textTransform:"uppercase",letterSpacing:"0.5px"}}>{item.type}</span>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.35)",minWidth:60}}>{item.time}</span>
                  <span style={{flex:1,fontSize:13,color:"#fff"}}>{item.title}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>{item.day}</span>
                  {isSynced&&<span style={{fontSize:11,color:"#34c98a",fontWeight:600}}>🗓️ synced</span>}
                </div>
              );
            })
          }
        </div>

        <div style={{display:"flex",gap:12,marginTop:16}}>
          <button onClick={downloadICS} disabled={!Object.values(calSel).some(Boolean)} style={{...S.btn("#4f9cf9"),opacity:Object.values(calSel).some(Boolean)?1:0.4,padding:"12px 24px",fontSize:14}}>
            📥 Download .ics ({Object.values(calSel).filter(Boolean).length})
          </button>
          <button onClick={simulateCalSync} style={{...S.btn("rgba(255,255,255,0.08)"),padding:"12px 24px",fontSize:14}}>⟳ Sync All to Calendar</button>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  KEY INDICATORS (abbreviated, reuse v2 pattern)
  // ────────────────────────────────────────────────────────────────
  const renderIndicators=()=>(
    <div>
      {!isPro&&data.kis.length>=FREE_LIMITS.indicators&&(
        <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,padding:"12px 18px",marginBottom:16,fontSize:13,color:"#f59e0b",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>Free plan: {data.kis.length}/{FREE_LIMITS.indicators} indicators used.</span>
          <button onClick={goPro} style={{...S.btn("rgba(245,158,11,0.9)","#000"),fontSize:12,padding:"6px 14px"}}>Upgrade</button>
        </div>
      )}
      {CATS.map(cat=>{
        const catKIs=data.kis.filter(k=>k.category===cat.id);
        const pctVal=cat.id==="financial"?0:catPct(cat.id);
        return(
          <div key={cat.id} style={{...S.card,marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{cat.icon}</span>
                <div><div style={{fontFamily:"'Syne',serif",fontSize:17,color:cat.color,fontWeight:700}}>{cat.label}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>Track your {cat.label.toLowerCase()} habits</div></div>
              </div>
              <div style={{fontSize:22,fontWeight:700,color:cat.color}}>{pctVal}%</div>
            </div>
            {cat.id==="financial"&&<div style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontStyle:"italic",marginBottom:8}}>💡 Financial tracking is in the Financial Goals tab.</div>}
            {catKIs.length===0&&cat.id!=="financial"&&<div style={{textAlign:"center",padding:"16px 0",color:"rgba(255,255,255,0.25)",fontSize:13,fontStyle:"italic"}}>No indicators — add one below.</div>}
            {catKIs.map(k=>{
              const tot=kiTotal(k),pct=Math.min(tot/k.weeklyGoal*100,100);
              return(
                <div key={k.id} style={{background:"rgba(255,255,255,0.03)",borderRadius:12,padding:14,marginBottom:10,border:`1px solid ${cat.color}18`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{k.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>Goal: {k.weeklyGoal} {k.unit}/wk · <span style={{color:tot>=k.weeklyGoal?cat.color:"#fff",fontWeight:700}}>{tot} {k.unit}</span></div></div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:16,fontWeight:700,color:pct>=100?cat.color:"#fff"}}>{Math.round(pct)}%</span>
                      <button onClick={()=>delKI(k.id)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:15}}>✕</button>
                    </div>
                  </div>
                  <Bar pct={pct} color={cat.color} h={5}/>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,marginTop:10}}>
                    {DAYS.map(day=>(
                      <div key={day} style={{textAlign:"center"}}>
                        <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginBottom:3}}>{day.slice(0,2)}</div>
                        <input type="number" min="0" placeholder="0" value={k.dailyLogs[day]||""} onChange={e=>logKI(k.id,day,e.target.value)} style={{...S.inp,padding:"6px 3px",textAlign:"center",fontSize:13}}/>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {cat.id!=="financial"&&(
              <div style={{background:`${cat.color}0c`,borderRadius:10,padding:12,border:`1px dashed ${cat.color}28`,marginTop:6}}>
                <div style={{fontSize:10,color:cat.color,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:9}}>Add {cat.label} Indicator</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 90px 70px auto",gap:8}}>
                  <input placeholder="Indicator name" value={newKI.category===cat.id?newKI.name:""} onFocus={()=>setNewKI(p=>({...p,category:cat.id}))} onChange={e=>setNewKI(p=>({...p,name:e.target.value,category:cat.id}))} style={S.inp}/>
                  <input placeholder="Unit" value={newKI.category===cat.id?newKI.unit:"times"} onChange={e=>setNewKI(p=>({...p,unit:e.target.value}))} style={S.inp}/>
                  <input type="number" placeholder="Goal" value={newKI.category===cat.id?newKI.weeklyGoal:""} onChange={e=>setNewKI(p=>({...p,weeklyGoal:parseInt(e.target.value)||5}))} style={S.inp}/>
                  <button onClick={addKI} style={{...S.btn(cat.color),padding:"10px 14px"}}>+</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ────────────────────────────────────────────────────────────────
  //  YEARLY GOALS
  // ────────────────────────────────────────────────────────────────
  const ACTIVITY_LEVELS=[
    {id:"sedentary",label:"Sedentary (desk job)",multiplier:1.2},
    {id:"light",label:"Light activity (1-3x/week)",multiplier:1.375},
    {id:"moderate",label:"Moderate (3-5x/week)",multiplier:1.55},
    {id:"active",label:"Very active (6-7x/week)",multiplier:1.725},
    {id:"extra",label:"Extra active (athlete)",multiplier:1.9},
  ];
  const RATE_MODES=[
    {id:"gradual",label:"Gradual",delta:0.5,color:"#34c98a",desc:"±0.5 lb/week — easiest, most sustainable"},
    {id:"normal", label:"Normal", delta:1.0, color:"#4f9cf9",desc:"±1 lb/week — recommended by most guidelines"},
    {id:"aggressive",label:"Aggressive",delta:2.0,color:"#f97b4f",desc:"±2 lb/week — faster results, more discipline required"},
  ];
  const calcCalories=(cg)=>{
    if(!cg?.currentWeight||!cg?.targetWeight||!cg?.height||!cg?.age)return null;
    const {currentWeight,height,age,sex,activity,mode,targetWeight}=cg;
    const bmr=sex==="female"
      ?(10*currentWeight*0.453592)+(6.25*height*2.54)-(5*age)-161
      :(10*currentWeight*0.453592)+(6.25*height*2.54)-(5*age)+5;
    const actMult=ACTIVITY_LEVELS.find(a=>a.id===activity)?.multiplier||1.55;
    const tdee=Math.round(bmr*actMult);
    const rate=RATE_MODES.find(r=>r.id===mode)?.delta||1;
    const gaining=targetWeight>currentWeight;
    const calDelta=Math.round(rate*500);
    const target=gaining?tdee+calDelta:tdee-calDelta;
    const weeksToGoal=Math.abs((targetWeight-currentWeight)/rate);
    const protein=Math.round(currentWeight*(gaining?1.0:1.2));
    const carbs=Math.round(target*0.45/4);
    const fat=Math.round(target*0.30/9);
    return{tdee,target,gaining,weeksToGoal:Math.round(weeksToGoal),calDelta,protein,carbs,fat,rate};
  };

  const renderYearly=()=>{

    return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div><h2 style={{...S.title,fontSize:22,margin:0}}>Life Goals</h2><p style={{margin:"4px 0 0",color:"rgba(255,255,255,0.35)",fontSize:13}}>Big goals across all life dimensions.</p></div>
        <button onClick={()=>{setShowGoalForm(true);setEditGoalId(null);setNewGoal({category:"intellectual",title:"",description:"",target:"",progress:0,steps:[],weekSteps:"",milestonesRequired:false}); }} style={S.btn("#4f9cf9")}>+ Add Goal</button>
      </div>
      {!isPro&&data.yearlyGoals.length>=FREE_LIMITS.yearlyGoals&&(
        <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,padding:"12px 18px",marginBottom:18,fontSize:13,color:"#f59e0b",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>Free plan: {data.yearlyGoals.length}/{FREE_LIMITS.yearlyGoals} goals used.</span>
          <button onClick={goPro} style={{...S.btn("rgba(245,158,11,0.9)","#000"),fontSize:12,padding:"6px 14px"}}>Upgrade</button>
        </div>
      )}
      {showGoalForm&&(
        <div style={{...S.card,borderColor:`${cc(newGoal.category)}35`,marginBottom:22,background:"rgba(255,255,255,0.05)"}}>
          <p style={{...S.title,marginBottom:16}}>{editGoalId?"Edit Goal":"New Life Goal"}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div><label style={S.lbl}>Category</label><select value={newGoal.category} onChange={e=>setNewGoal(p=>({...p,category:e.target.value}))} style={{...S.sel,width:"100%"}}>{CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
            <div><label style={S.lbl}>Target Date</label><input type="date" value={newGoal.target} onChange={e=>setNewGoal(p=>({...p,target:e.target.value}))} style={S.inp}/></div>
          </div>
          <div style={{marginBottom:12}}><label style={S.lbl}>Goal Title</label><input placeholder="E.g. Read 24 books this year" value={newGoal.title} onChange={e=>setNewGoal(p=>({...p,title:e.target.value}))} style={S.inp}/></div>
          <div style={{marginBottom:12}}><label style={S.lbl}>Why does this matter?</label><textarea placeholder="Describe your motivation..." value={newGoal.description} onChange={e=>setNewGoal(p=>({...p,description:e.target.value}))} style={{...S.inp,minHeight:65,resize:"vertical",lineHeight:1.6}}/></div>
          {isPro&&(
            <div style={{marginBottom:14,background:"rgba(16,185,129,0.06)",borderRadius:10,padding:"12px 14px",border:"1px solid rgba(16,185,129,0.2)"}}>
              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                <div onClick={()=>setNewGoal(p=>({...p,milestonesRequired:!p.milestonesRequired}))} style={{width:20,height:20,borderRadius:5,border:`2px solid ${newGoal.milestonesRequired?"#10b981":"rgba(255,255,255,0.25)"}`,background:newGoal.milestonesRequired?"#10b981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                  {newGoal.milestonesRequired&&<span style={{color:"#000",fontSize:12}}>✓</span>}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#10b981"}}>★ Require milestone completion before progress</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>Pro — Progress % will only update when you complete milestones you agreed to.</div>
                </div>
              </label>
            </div>
          )}
          <div style={{display:"flex",gap:10}}><button onClick={saveGoal} style={S.btn(cc(newGoal.category))}>{editGoalId?"Save":"Add Goal"}</button><button onClick={()=>setShowGoalForm(false)} style={S.btn("rgba(255,255,255,0.1)")}>Cancel</button></div>
        </div>
      )}

      {/* Calorie Calculator Modal (Pro) */}
      {calorieGoal&&<CalorieModal calorieGoal={calorieGoal} setCalorieGoal={setCalorieGoal} RATE_MODES={RATE_MODES} ACTIVITY_LEVELS={ACTIVITY_LEVELS} calcCalories={calcCalories}/> }

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:18}}>
        {data.yearlyGoals.map(g=>{
          const color=cc(g.category);
          // Milestone-gated progress (Pro feature)
          const milesGated=isPro&&g.milestonesRequired&&(g.steps||[]).length>0;
          const milesTotal=(g.steps||[]).length;
          const milesDone=(g.steps||[]).filter(s=>s.done).length;
          const milesProgress=milesTotal>0?Math.round(milesDone/milesTotal*100):0;
          const displayProgress=milesGated?milesProgress:g.progress;
          const isPhysical=g.category==="physical";
          return(
            <div key={g.id} style={{...S.card,borderLeft:`4px solid ${color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <Tag catId={g.category}/>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {milesGated&&<span style={{fontSize:9,color:"#10b981",background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:5,padding:"2px 7px",fontWeight:700}}>★ GATED</span>}
                  {isPhysical&&isPro&&<button onClick={()=>{setCalorieGoal({goalId:g.id,currentWeight:"",targetWeight:"",height:"",age:"",sex:"male",activity:"moderate",mode:"normal"});upd(p=>({...p,achievementStats:{...p.achievementStats,calorieCalcUsed:(p.achievementStats?.calorieCalcUsed||0)+1}}));}} style={{background:"rgba(249,123,79,0.1)",border:"1px solid rgba(249,123,79,0.3)",color:"#f97b4f",borderRadius:7,padding:"3px 9px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>🥗 Calories</button>}
                  <button onClick={()=>{setNewGoal({...g,milestonesRequired:g.milestonesRequired||false});setEditGoalId(g.id);setShowGoalForm(true);}} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:14}}>✎</button>
                  <button onClick={()=>upd(p=>({...p,yearlyGoals:p.yearlyGoals.filter(x=>x.id!==g.id)}))} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:14}}>✕</button>
                </div>
              </div>
              <div style={{fontFamily:"'Syne',serif",fontSize:16,color:"#fff",fontWeight:700,marginBottom:4}}>{g.title}</div>
              {g.description&&<div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:10,lineHeight:1.5}}>{g.description}</div>}
              {g.target&&<div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:10}}>🗓 {new Date(g.target).toLocaleDateString("en",{month:"long",day:"numeric",year:"numeric"})}</div>}
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Progress{milesGated?" (milestone-gated)":""}</span>
                  <span style={{fontSize:13,fontWeight:700,color}}>{displayProgress}%</span>
                </div>
                <Bar pct={displayProgress} color={color} h={7}/>
                {milesGated
                  ?<div style={{fontSize:10,color:"rgba(16,185,129,0.7)",marginTop:5}}>★ Progress updates automatically as you complete milestones below ({milesDone}/{milesTotal} done)</div>
                  :<input type="range" min="0" max="100" value={g.progress} onChange={e=>updGoal(g.id,"progress",parseInt(e.target.value))} style={{width:"100%",marginTop:7,accentColor:color}}/>
                }
              </div>
              {g.steps.length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:7}}>Milestones ({milesDone}/{milesTotal})</div>
                  {g.steps.map(s=>(
                    <div key={s.id} onClick={()=>togStep(g.id,s.id)} style={{display:"flex",alignItems:"center",gap:9,marginBottom:5,cursor:"pointer",padding:"6px 9px",borderRadius:7,background:s.done?"rgba(16,185,129,0.06)":"rgba(255,255,255,0.03)",border:s.done?"1px solid rgba(16,185,129,0.15)":"1px solid transparent"}}>
                      <div style={{width:15,height:15,borderRadius:4,flexShrink:0,border:`2px solid ${s.done?color:"rgba(255,255,255,0.2)"}`,background:s.done?color:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{s.done&&<span style={{color:"#000",fontSize:9}}>✓</span>}</div>
                      <span style={{fontSize:12,color:s.done?"rgba(255,255,255,0.3)":"#e8e4dc",textDecoration:s.done?"line-through":"none",flex:1}}>{s.text}</span>
                      {milesGated&&!s.done&&<span style={{fontSize:9,color:"rgba(16,185,129,0.6)"}}>→ +{milesTotal>0?Math.round(100/milesTotal):0}%</span>}
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <input placeholder="Add milestone…" value={stepInputs[g.id]||""} onChange={e=>setStepInputs(p=>({...p,[g.id]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"){addStep(g.id,stepInputs[g.id]||"");setStepInputs(p=>({...p,[g.id]:""}));}}} style={{...S.inp,fontSize:12}}/>
                <button onClick={()=>{addStep(g.id,stepInputs[g.id]||"");setStepInputs(p=>({...p,[g.id]:""}));}} style={{...S.btn(color),padding:"8px 12px"}}>+</button>
              </div>
              <div><label style={{...S.lbl,color}}>This Week's Step</label><textarea placeholder="What will you do this week?" value={g.weekSteps} onChange={e=>updGoal(g.id,"weekSteps",e.target.value)} style={{...S.inp,minHeight:55,resize:"vertical",fontSize:12,lineHeight:1.6,borderColor:`${color}28`}}/></div>
            </div>
          );
        })}
        {!data.yearlyGoals.length&&<div style={{...S.card,textAlign:"center",padding:48,color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>No goals yet. Click "+ Add Goal" to start.</div>}
      </div>
    </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  WEEKLY PLAN (unchanged from v2)
  // ────────────────────────────────────────────────────────────────
  const EVENT_TYPES=[
    {id:"work",label:"Work",color:"#4f9cf9",icon:"💼"},
    {id:"school",label:"School",color:"#c084fc",icon:"📚"},
    {id:"personal",label:"Personal",color:"#34c98a",icon:"🏠"},
    {id:"health",label:"Health",color:"#f97b4f",icon:"🏃"},
    {id:"social",label:"Social",color:"#fbbf24",icon:"🤝"},
    {id:"other",label:"Other",color:"#94a3b8",icon:"📌"},
  ];
  const REPEAT_OPTS=[{v:"none",l:"No Repeat"},{v:"daily",l:"Daily (all 7 days)"},{v:"weekly",l:"Weekly (this day)"},{v:"yearly",l:"Yearly"}];

  const renderWeekly=()=>(
    <div style={{display:"grid",gridTemplateColumns:"190px 1fr",gap:20}}>
      <div style={{...S.card,padding:"10px 0",height:"fit-content"}}>
        {DAYS.map((day,i)=>{
          const tasks=data.weekDays[day]?.tasks||[];
          const events=data.weekDays[day]?.events||[];
          const done=tasks.filter(t=>t.done).length;
          const active=selDay===day;
          return(
            <button key={day} onClick={()=>upd(p=>({...p,selectedDay:day}))} style={{width:"100%",padding:"11px 16px",border:"none",cursor:"pointer",background:active?"rgba(79,156,249,0.1)":"transparent",color:active?"#fff":"rgba(255,255,255,0.45)",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'DM Sans',sans-serif",fontSize:13,borderLeft:active?"3px solid #4f9cf9":"3px solid transparent",transition:"all 0.15s"}}>
              <div style={{textAlign:"left"}}><div style={{fontWeight:active?600:400}}>{day}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginTop:1}}>{dayDate(i).toLocaleDateString("en",{month:"short",day:"numeric"})}</div></div>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                {events.length>0&&<span style={{background:"rgba(192,132,252,0.3)",color:"#c084fc",borderRadius:8,padding:"1px 5px",fontSize:9}}>📅{events.length}</span>}
                {tasks.length>0&&<span style={{background:active?"#4f9cf9":"rgba(255,255,255,0.1)",color:active?"#fff":"rgba(255,255,255,0.5)",borderRadius:10,padding:"1px 7px",fontSize:10}}>{done}/{tasks.length}</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div>
        {/* Events card */}
        <div style={{...S.card,marginBottom:14,borderColor:"rgba(192,132,252,0.2)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div>
              <p style={{...S.title,fontSize:15,margin:0}}>📅 {selDay} Events</p>
              <p style={{...S.sub,margin:0}}>Work, school, appointments</p>
            </div>
            <button onClick={()=>setShowEventForm(p=>!p)} style={{...S.btn("#c084fc"),padding:"7px 14px",fontSize:12}}>+ Add Event</button>
          </div>
          {showEventForm&&(
            <div style={{background:"rgba(192,132,252,0.06)",borderRadius:12,padding:14,border:"1px dashed rgba(192,132,252,0.3)",marginBottom:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><label style={S.lbl}>Event Title</label><input value={newEvent.title} onChange={e=>setNewEvent(p=>({...p,title:e.target.value}))} placeholder="Team meeting, Class, Appointment…" style={S.inp}/></div>
                <div><label style={S.lbl}>Date</label><input type="date" value={newEvent.date} onChange={e=>setNewEvent(p=>({...p,date:e.target.value}))} style={S.inp}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                <div><label style={S.lbl}>Start</label>
                  <TimeInput value={newEvent.startTime} onChange={v=>setNewEvent(p=>({...p,startTime:v}))}/>
                </div>
                <div><label style={S.lbl}>End</label>
                  <TimeInput value={newEvent.endTime} onChange={v=>setNewEvent(p=>({...p,endTime:v}))}/>
                </div>
                <div><label style={S.lbl}>Type</label>
                  <select value={newEvent.type} onChange={e=>setNewEvent(p=>({...p,type:e.target.value}))} style={S.sel}>
                    {EVENT_TYPES.map(et=><option key={et.id} value={et.id}>{et.icon} {et.label}</option>)}
                  </select>
                </div>
              </div>
              <input placeholder="Notes (optional)" value={newEvent.notes} onChange={e=>setNewEvent(p=>({...p,notes:e.target.value}))} style={{...S.inp,fontSize:12,marginBottom:8}}/>
              <div style={{marginBottom:8}}>
                <label style={{...S.lbl,fontSize:9}}>Repeat</label>
                <select value={newEvent.repeat} onChange={e=>setNewEvent(p=>({...p,repeat:e.target.value}))} style={S.sel}>
                  <option value="none">No Repeat</option>
                  <option value="daily">Daily (all 7 days)</option>
                  <option value="weekly">Weekly (this day)</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addEvent} style={{...S.btn("#c084fc"),flex:1}}>Save Event</button>
                <button onClick={()=>setShowEventForm(false)} style={{...S.btn("rgba(255,255,255,0.08)"),flex:1,color:"rgba(255,255,255,0.5)"}}>Cancel</button>
              </div>
            </div>
          )}
          {(data.weekDays[selDay]?.events||[]).length===0
            ?<div style={{textAlign:"center",padding:"14px 0",color:"rgba(255,255,255,0.2)",fontSize:12,fontStyle:"italic"}}>No events. Add work meetings, classes, appointments…</div>
            :(data.weekDays[selDay].events||[]).map(ev=>{
              const et=EVENT_TYPES.find(x=>x.id===ev.type)||EVENT_TYPES[0];
              return(
                <div key={ev.id} style={{display:"flex",alignItems:"center",gap:10,background:`${et.color}12`,borderRadius:10,padding:"10px 13px",marginBottom:7,border:`1px solid ${et.color}30`}}>
                  <span style={{fontSize:16}}>{et.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{ev.title}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{ev.startTime} – {ev.endTime}{ev.notes?` · ${ev.notes}`:""}</div>
                  </div>
                  <span style={{background:`${et.color}20`,color:et.color,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{et.label}</span>
                  {ev.recurring&&<span style={{fontSize:9,color:"#c084fc",background:"rgba(192,132,252,0.12)",borderRadius:4,padding:"2px 6px",fontWeight:700}}>🔁 {ev.recurring}</span>}
                  <button onClick={()=>delEvent(selDay,ev.id)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.15)",cursor:"pointer",fontSize:15}}>×</button>
                </div>
              );
            })
          }
        </div>

        {/* Tasks card */}
        <div style={{...S.card,marginBottom:14}}>
          <h2 style={{...S.title,fontSize:20,marginBottom:3}}>{selDay}</h2>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginBottom:16}}>{dayDate(DAYS.indexOf(selDay)).toLocaleDateString("en",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
          {data.yearlyGoals.filter(g=>g.weekSteps).length>0&&(
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:12,marginBottom:14,border:"1px solid rgba(255,255,255,0.07)"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8}}>From Goals This Week</div>
              {data.yearlyGoals.filter(g=>g.weekSteps).map(g=>(
                <div key={g.id} style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:7}}><Tag catId={g.category}/><div><div style={{fontSize:12,fontWeight:600,color:cc(g.category)}}>{g.title}</div><div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>{g.weekSteps}</div></div></div>
              ))}
            </div>
          )}
          {(data.weekDays[selDay]?.tasks||[]).length===0
            ?<div style={{textAlign:"center",padding:"22px 0",color:"rgba(255,255,255,0.2)",fontSize:13,fontStyle:"italic"}}>No tasks yet.</div>
            :(data.weekDays[selDay].tasks).map(t=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,background:t.done?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.04)",borderRadius:10,padding:"11px 13px",marginBottom:7,border:`1px solid ${t.done?"rgba(255,255,255,0.04)":cc(t.category)+"28"}`,opacity:t.done?0.55:1,transition:"opacity 0.2s"}}>
                <div onClick={()=>togTask(selDay,t.id)} style={{width:17,height:17,borderRadius:5,flexShrink:0,border:`2px solid ${t.done?cc(t.category):"rgba(255,255,255,0.22)"}`,background:t.done?cc(t.category):"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{t.done&&<span style={{color:"#000",fontSize:10}}>✓</span>}</div>
                <Tag catId={t.category}/>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.35)",minWidth:56}}>{t.time}</span>
                <span style={{flex:1,fontSize:14,color:t.done?"rgba(255,255,255,0.35)":"#fff",textDecoration:t.done?"line-through":"none"}}>{t.title}</span>
                {t.recurring&&<span style={{fontSize:9,color:"#4f9cf9",background:"rgba(79,156,249,0.12)",borderRadius:4,padding:"1px 6px",fontWeight:700}}>🔁 {t.recurring}</span>}
                {t.notes&&<span style={{fontSize:10,color:"rgba(255,255,255,0.25)",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.notes}</span>}
                <button onClick={()=>delTask(selDay,t.id)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.15)",cursor:"pointer",fontSize:15}}>×</button>
              </div>
            ))
          }
          {/* Add Task Form */}
          <div style={{background:"rgba(79,156,249,0.05)",borderRadius:12,padding:14,border:"1px dashed rgba(79,156,249,0.2)",marginTop:8}}>
            <div style={{fontSize:10,color:"rgba(79,156,249,0.8)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:10}}>Add Task</div>
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr 130px auto",gap:8,marginBottom:8}}>
              <TimeInput value={newTask.time} onChange={v=>setNewTask(p=>({...p,time:v}))}/>
              <input placeholder="Task title" value={newTask.title} onChange={e=>setNewTask(p=>({...p,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addTask()} style={S.inp}/>
              <select value={newTask.category} onChange={e=>setNewTask(p=>({...p,category:e.target.value}))} style={S.sel}>
                {CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <button onClick={addTask} style={{...S.btn("#4f9cf9"),padding:"10px 14px",fontSize:18,fontWeight:700}}>+</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div>
                <label style={{...S.lbl,fontSize:9}}>Repeat</label>
                <select value={newTask.repeat} onChange={e=>setNewTask(p=>({...p,repeat:e.target.value}))} style={S.sel}>
                  {REPEAT_OPTS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
              </div>
              <div>
                <label style={{...S.lbl,fontSize:9}}>Notes</label>
                <input placeholder="Optional notes" value={newTask.notes} onChange={e=>setNewTask(p=>({...p,notes:e.target.value}))} style={{...S.inp,fontSize:12}}/>
              </div>
            </div>
            {newTask.repeat!=="none"&&<div style={{fontSize:11,color:"#4f9cf9",background:"rgba(79,156,249,0.08)",borderRadius:8,padding:"6px 10px"}}>
              {newTask.repeat==="daily"?"🔁 This task will be added to all 7 days":newTask.repeat==="weekly"?"🔁 Marked as weekly recurring on "+selDay:"📅 Marked as yearly recurring"}
            </div>}
          </div>
        </div>
        <div style={S.card}><label style={S.lbl}>Day Notes</label><textarea placeholder="Impressions, ideas, things on your mind…" value={data.weekDays[selDay]?.notes||""} onChange={e=>upd(p=>{const wd={...p.weekDays};wd[selDay]={...wd[selDay],notes:e.target.value};return{...p,weekDays:wd};})} style={{...S.inp,minHeight:90,resize:"vertical",lineHeight:1.7}}/></div>

        {/* ── GOOGLE CALENDAR SYNC (Pro) embedded in Weekly Plan ── */}
        <div style={{marginTop:24}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{height:1,flex:1,background:"rgba(255,255,255,0.07)"}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.25)",letterSpacing:"2px",textTransform:"uppercase"}}>Google Calendar Sync</span>
            <div style={{height:1,flex:1,background:"rgba(255,255,255,0.07)"}}/>
          </div>
          {!isPro?(
            <Lock onUpgrade={goPro} msg="Google Calendar Live Sync is a Pro feature. Upgrade to sync all your weekly tasks, events, and goal steps in real time."/>
          ):(
            <div>
              <div style={{...S.card,marginBottom:14,borderColor:"rgba(79,156,249,0.25)",background:"rgba(79,156,249,0.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div>
                    <p style={{...S.title,color:"#4f9cf9",margin:"0 0 3px"}}>🗓️ Google Calendar Live Sync</p>
                    <p style={{...S.sub,margin:0,fontSize:12}}>Tasks, events, and goal steps — all synced.</p>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    {data.calendarConnected&&<div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(52,201,138,0.12)",border:"1px solid rgba(52,201,138,0.3)",borderRadius:8,padding:"5px 10px"}}><div style={{width:7,height:7,borderRadius:"50%",background:"#34c98a",animation:"pulse 2s infinite"}}/><span style={{fontSize:11,color:"#34c98a",fontWeight:600}}>Connected</span></div>}
                    <button onClick={simulateCalSync} style={{...S.btn(calSyncStatus==="syncing"?"rgba(79,156,249,0.5)":calSyncStatus==="synced"?"#34c98a":"#4f9cf9"),display:"flex",alignItems:"center",gap:6}}>
                      {calSyncStatus==="syncing"&&<span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>}
                      {calSyncStatus==="synced"?"✓ Synced!":calSyncStatus==="syncing"?"Syncing…":"⟳ Sync Now"}
                    </button>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                  {["all","task","goal","financial","event"].map(f=>(
                    <button key={f} onClick={()=>setCalFilter(f)} style={{padding:"5px 12px",border:`1px solid ${calFilter===f?"rgba(79,156,249,0.5)":"rgba(255,255,255,0.08)"}`,borderRadius:20,background:calFilter===f?"rgba(79,156,249,0.12)":"transparent",color:calFilter===f?"#4f9cf9":"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",textTransform:"capitalize"}}>
                      {f==="all"?"All":f==="task"?"Tasks":f==="goal"?"Goals":f==="financial"?"Financial":"Events"}
                    </button>
                  ))}
                  <button onClick={()=>{const m={};exportItems.forEach(i=>{m[i.id]=true;});setCalSel(m);}} style={{...S.btn("rgba(255,255,255,0.07)"),fontSize:11,padding:"5px 12px"}}>Select All</button>
                  <button onClick={()=>setCalSel({})} style={{...S.btn("rgba(255,255,255,0.05)"),fontSize:11,padding:"5px 12px"}}>Clear</button>
                </div>
                <div style={{maxHeight:280,overflowY:"auto"}}>
                  {(calFilter==="all"?exportItems:exportItems.filter(i=>i.type===calFilter)).length===0
                    ?<div style={{textAlign:"center",padding:"20px 0",color:"rgba(255,255,255,0.25)",fontSize:12,fontStyle:"italic"}}>No items. Add tasks, events, or goal steps first.</div>
                    :(calFilter==="all"?exportItems:exportItems.filter(i=>i.type===calFilter)).map(item=>{
                      const isSynced=(data.calendarEvents||[]).some(s=>s.id===item.id);
                      return(
                        <div key={item.id} onClick={()=>setCalSel(p=>({...p,[item.id]:!p[item.id]}))} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,cursor:"pointer",marginBottom:5,background:calSel[item.id]?"rgba(79,156,249,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${calSel[item.id]?"rgba(79,156,249,0.4)":"rgba(255,255,255,0.06)"}`,transition:"all 0.15s"}}>
                          <div style={{width:15,height:15,borderRadius:4,flexShrink:0,border:`2px solid ${calSel[item.id]?"#4f9cf9":"rgba(255,255,255,0.2)"}`,background:calSel[item.id]?"#4f9cf9":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{calSel[item.id]&&<span style={{color:"#000",fontSize:9}}>✓</span>}</div>
                          <span style={{padding:"1px 7px",borderRadius:5,fontSize:9,fontWeight:700,textTransform:"uppercase",background:item.type==="task"?"rgba(79,156,249,0.12)":item.type==="goal"?"rgba(52,201,138,0.12)":item.type==="event"?"rgba(192,132,252,0.12)":"rgba(251,191,36,0.12)",color:item.type==="task"?"#4f9cf9":item.type==="goal"?"#34c98a":item.type==="event"?"#c084fc":"#fbbf24"}}>{item.type}</span>
                          <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",minWidth:56}}>{item.time}</span>
                          <span style={{flex:1,fontSize:13,color:"#fff"}}>{item.title}</span>
                          <span style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>{item.day}</span>
                          {isSynced&&<span style={{fontSize:10,color:"#34c98a"}}>🗓️</span>}
                        </div>
                      );
                    })
                  }
                </div>
                <div style={{display:"flex",gap:10,marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.07)"}}>
                  <button onClick={downloadICS} disabled={!Object.values(calSel).some(Boolean)} style={{...S.btn("#4f9cf9"),opacity:Object.values(calSel).some(Boolean)?1:0.4,flex:1}}>
                    📥 Download .ics ({Object.values(calSel).filter(Boolean).length})
                  </button>
                  <button onClick={simulateCalSync} style={{...S.btn("rgba(255,255,255,0.08)"),flex:1}}>⟳ Sync All</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────
  //  REFLECTION
  // ────────────────────────────────────────────────────────────────
  const renderReflection=()=>{
    const ref=data.currentReflection;
    const setRef=(field,val)=>upd(p=>({...p,currentReflection:{...p.currentReflection,[field]:val}}));
    return(
      <div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
          <div style={S.card}><p style={S.title}>✅ What Went Well?</p><p style={S.sub}>Celebrate your wins.</p><textarea placeholder="I was consistent with my routine…" value={ref.wentWell} onChange={e=>setRef("wentWell",e.target.value)} style={{...S.inp,minHeight:130,resize:"vertical",lineHeight:1.7}}/></div>
          <div style={S.card}><p style={S.title}>🔄 What Could Be Better?</p><p style={S.sub}>Honest, kind reflection.</p><textarea placeholder="I could improve my consistency with…" value={ref.improve} onChange={e=>setRef("improve",e.target.value)} style={{...S.inp,minHeight:130,resize:"vertical",lineHeight:1.7}}/></div>
        </div>
        <div style={{...S.card,marginBottom:18}}>
          <p style={S.title}>Category Check-In</p><p style={S.sub}>One sentence per dimension.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {CATS.map(cat=>(
              <div key={cat.id} style={{background:cat.light,borderRadius:10,padding:14,border:`1px solid ${cat.color}28`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}><span style={{fontSize:18}}>{cat.icon}</span><span style={{fontSize:13,fontWeight:600,color:cat.color}}>{cat.label}</span></div>
                <textarea placeholder={`How was your ${cat.label.toLowerCase()} health this week?`} value={(ref.catNotes||{})[cat.id]||""} onChange={e=>upd(p=>({...p,currentReflection:{...p.currentReflection,catNotes:{...(p.currentReflection.catNotes||{}),[cat.id]:e.target.value}}}))} style={{...S.inp,minHeight:65,fontSize:12,lineHeight:1.6,background:"rgba(0,0,0,0.2)",borderColor:`${cat.color}28`}}/>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
          <div style={S.card}>
            <p style={S.title}>Week Rating</p><p style={S.sub}>How would you rate this week?</p>
            <div style={{textAlign:"center",marginBottom:8}}><span style={{fontSize:48,fontWeight:800,color:ref.rating>=8?"#34c98a":ref.rating>=5?"#4f9cf9":"#f97b4f"}}>{ref.rating}</span><span style={{fontSize:18,color:"rgba(255,255,255,0.3)"}}>/10</span></div>
            <input type="range" min="1" max="10" value={ref.rating} onChange={e=>setRef("rating",parseInt(e.target.value))} style={{width:"100%",accentColor:"#4f9cf9"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:4}}><span>Tough</span><span>Amazing</span></div>
          </div>
          <div style={S.card}><p style={S.title}>Next Week's Commitment</p><p style={S.sub}>One thing you'll do differently.</p><textarea placeholder="Next week I will…" value={ref.commitment} onChange={e=>setRef("commitment",e.target.value)} style={{...S.inp,minHeight:100,resize:"vertical",lineHeight:1.7}}/></div>
        </div>
        <button onClick={()=>{
          const entry={...data.currentReflection,date:new Date().toLocaleDateString(),week:getMon().toLocaleDateString()};
          upd(p=>({...p,reflections:[entry,...(p.reflections||[])],currentReflection:{wentWell:"",improve:"",catNotes:{},rating:7,commitment:""}}));
        }} style={{...S.btn("#34c98a"),marginBottom:28,padding:"12px 26px",fontSize:14}}>💾 Save Reflection</button>
        {(data.reflections||[]).length>0&&(
          <div style={S.card}>
            <p style={S.title}>Past Reflections</p><p style={S.sub}>Your growth over time.</p>
            {(data.reflections||[]).map((r,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.03)",borderRadius:12,padding:14,marginBottom:10,border:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:13,fontWeight:600,color:"#fff"}}>Week of {r.week}</span><span style={{fontSize:18,fontWeight:700,color:r.rating>=8?"#34c98a":r.rating>=5?"#4f9cf9":"#f97b4f"}}>{r.rating}/10</span></div>
                {r.wentWell&&<div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:4}}><strong style={{color:"#34c98a"}}>✅</strong> {r.wentWell}</div>}
                {r.improve&&<div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:4}}><strong style={{color:"#f97b4f"}}>🔄</strong> {r.improve}</div>}
                {r.commitment&&<div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}><strong style={{color:"#4f9cf9"}}>💡</strong> {r.commitment}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  ANALYTICS (PRO) — multi-line graphs
  // ────────────────────────────────────────────────────────────────
  const renderAnalytics=()=>{
    if(!isPro)return<Lock onUpgrade={goPro}/>;
    const weeks=(data.reflections||[]).slice(0,12).reverse();
    const goals=data.yearlyGoals;
    const finGoals=data.financialGoals||[];

    // ── SVG Line Graph helper ──────────────────────────────────────
    const LineGraph=({series,yMax=100,yLabel="",height=160,title,sub,colors,xLabels})=>{
      const W=560,H=height,PAD_L=42,PAD_R=16,PAD_T=16,PAD_B=32;
      const gW=W-PAD_L-PAD_R, gH=H-PAD_T-PAD_B;
      const xTicks=[0,25,50,75,100].map(v=>v/100*yMax).filter(v=>v<=yMax);
      const mapPt=(i,v,n)=>({
        x: PAD_L+(n<2?gW*0.5:gW*(i/(n-1))),
        y: PAD_T+gH*(1-(v/yMax))
      });
      if(!series.length||!series[0].data.length)return(
        <div style={{...S.card,marginBottom:20}}>
          <p style={S.title}>{title}</p><p style={S.sub}>{sub}</p>
          <div style={{textAlign:"center",padding:"36px 0",color:"rgba(255,255,255,0.2)",fontStyle:"italic",fontSize:13}}>Not enough data yet — keep using the app!</div>
        </div>
      );
      return(
        <div style={{...S.card,marginBottom:20}}>
          <p style={S.title}>{title}</p><p style={S.sub}>{sub}</p>
          <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,overflow:"visible",fontFamily:"'DM Sans',sans-serif"}}>
            <defs>
              {series.map((s,si)=>(
                <linearGradient key={si} id={`ag${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors[si%colors.length]} stopOpacity="0.25"/>
                  <stop offset="100%" stopColor={colors[si%colors.length]} stopOpacity="0.01"/>
                </linearGradient>
              ))}
            </defs>
            {/* Y-axis grid */}
            {[0,25,50,75,100].map(pct=>{
              const v=pct/100*yMax;
              const y=PAD_T+gH*(1-(v/yMax));
              return <g key={pct}>
                <line x1={PAD_L} y1={y} x2={W-PAD_R} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                <text x={PAD_L-6} y={y+4} textAnchor="end" fill="rgba(255,255,255,0.22)" fontSize="9">{yLabel}{Math.round(v)}</text>
              </g>;
            })}
            {/* X-axis */}
            <line x1={PAD_L} y1={PAD_T+gH} x2={W-PAD_R} y2={PAD_T+gH} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
            {/* X labels */}
            {xLabels&&xLabels.map((lbl,i)=>{
              const n=xLabels.length;
              const x=PAD_L+(n<2?gW*0.5:gW*(i/(n-1)));
              return <text key={i} x={x} y={H-4} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="9">{lbl}</text>;
            })}
            {/* Series */}
            {series.map((s,si)=>{
              const col=colors[si%colors.length];
              const n=s.data.length;
              const pts=s.data.map((v,i)=>mapPt(i,v,n));
              const pathD=pts.map((p,i)=>i===0?`M${p.x.toFixed(1)},${p.y.toFixed(1)}`:`L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
              const areaD=pts.length>1?`${pathD} L${pts[n-1].x.toFixed(1)},${(PAD_T+gH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD_T+gH).toFixed(1)} Z`:"";
              return <g key={si}>
                {pts.length>1&&<path d={areaD} fill={`url(#ag${si})`}/>}
                {pts.length>1&&<path d={pathD} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
                {pts.map((p,i)=>(
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="5" fill={col} stroke="#08090d" strokeWidth="2"/>
                    {series.length===1&&<text x={p.x} y={p.y-10} textAnchor="middle" fill={col} fontSize="10" fontWeight="700">{Math.round(s.data[i])}{yLabel}</text>}
                  </g>
                ))}
              </g>;
            })}
          </svg>
          {/* Legend */}
          {series.length>1&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:6}}>
              {series.map((s,si)=>(
                <div key={si} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:14,height:3,borderRadius:2,background:colors[si%colors.length]}}/>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    // ── Weekly mood/rating line ────────────────────────────────────
    const moodSeries=[{label:"Week Rating",data:weeks.map(r=>r.rating)}];
    const moodXLabels=weeks.map((_,i)=>`W${i+1}`);
    const moodStats=weeks.length?{
      best:Math.max(...weeks.map(r=>r.rating)),
      avg:(weeks.reduce((a,r)=>a+r.rating,0)/weeks.length).toFixed(1),
      trend:weeks.length>1?(weeks[weeks.length-1].rating-weeks[0].rating):0,
      total:weeks.length
    }:null;

    // ── Goal progress lines ────────────────────────────────────────
    // Synthetic: use yearlyGoals current progress as endpoint; reflections don't store history yet
    // We show current state + milestones done as a line
    const goalSeries=goals.slice(0,5).map(g=>({label:g.title.slice(0,20),data:[0,g.progress]}));
    const goalColors=CATS.map(c=>c.color);

    // ── Financial savings progress ─────────────────────────────────
    const finSeries=finGoals.slice(0,6).map(g=>({
      label:g.name.slice(0,18),
      data:[0,g.targetAmount>0?Math.min((g.saved||0)/g.targetAmount*100,100):0]
    }));

    // ── KI category radar as bar (SVG) ────────────────────────────
    const kiCatData=CATS.map(c=>({cat:c,pct:catPct(c.id)}));

    return(
      <div>
        {/* Mood/rating trend */}
        <LineGraph
          title="📈 Weekly Mood & Rating"
          sub={`Your self-rated week score over ${weeks.length} reflection${weeks.length!==1?"s":""}.`}
          series={moodSeries}
          yMax={10}
          height={160}
          colors={["#4f9cf9"]}
          xLabels={moodXLabels}
        />
        {moodStats&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20,marginTop:-10}}>
            <div style={{background:"rgba(52,201,138,0.1)",borderRadius:12,padding:"12px 14px",textAlign:"center",border:"1px solid rgba(52,201,138,0.2)"}}><div style={{fontSize:24,fontWeight:800,color:"#34c98a"}}>{moodStats.best}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Best Week</div></div>
            <div style={{background:"rgba(79,156,249,0.1)",borderRadius:12,padding:"12px 14px",textAlign:"center",border:"1px solid rgba(79,156,249,0.2)"}}><div style={{fontSize:24,fontWeight:800,color:"#4f9cf9"}}>{moodStats.avg}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Avg Rating</div></div>
            <div style={{background:"rgba(192,132,252,0.1)",borderRadius:12,padding:"12px 14px",textAlign:"center",border:"1px solid rgba(192,132,252,0.2)"}}><div style={{fontSize:24,fontWeight:800,color:"#c084fc"}}>{moodStats.total}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Weeks Tracked</div></div>
            <div style={{background:"rgba(251,191,36,0.1)",borderRadius:12,padding:"12px 14px",textAlign:"center",border:"1px solid rgba(251,191,36,0.2)"}}><div style={{fontSize:24,fontWeight:800,color:moodStats.trend>0?"#34c98a":moodStats.trend<0?"#f97b4f":"#fbbf24"}}>{moodStats.trend>0?"+":""}{moodStats.trend||"–"}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Trend</div></div>
          </div>
        )}

        {/* KI category performance bar graph */}
        <div style={{...S.card,marginBottom:20}}>
          <p style={S.title}>📊 Key Indicator Performance by Category</p>
          <p style={S.sub}>How well you're hitting KI goals across all 5 life dimensions this week.</p>
          {data.kis.length===0
            ?<div style={{textAlign:"center",padding:"28px 0",color:"rgba(255,255,255,0.2)",fontStyle:"italic",fontSize:13}}>Add Key Indicators to see performance data.</div>
            :<svg viewBox="0 0 560 160" style={{width:"100%",height:160,overflow:"visible"}}>
              <defs>
                {kiCatData.map(({cat},i)=>(
                  <linearGradient key={i} id={`kg${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cat.color} stopOpacity="0.9"/>
                    <stop offset="100%" stopColor={cat.color} stopOpacity="0.4"/>
                  </linearGradient>
                ))}
              </defs>
              {/* Y gridlines */}
              {[25,50,75,100].map(v=>{
                const y=20+(120*(1-v/100));
                return <g key={v}>
                  <line x1={40} y1={y} x2={540} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                  <text x={34} y={y+4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="9">{v}%</text>
                </g>;
              })}
              {/* Bars */}
              {kiCatData.map(({cat,pct},i)=>{
                const x=60+i*96;
                const barH=Math.max(4,pct/100*120);
                const y=140-barH;
                return <g key={i}>
                  <rect x={x} y={y} width={60} height={barH} rx="6" fill={`url(#kg${i})`}/>
                  <text x={x+30} y={y-6} textAnchor="middle" fill={cat.color} fontSize="11" fontWeight="700">{pct}%</text>
                  <text x={x+30} y={155} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10">{cat.icon} {cat.label.slice(0,5)}</text>
                </g>;
              })}
              <line x1={40} y1={140} x2={540} y2={140} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
            </svg>
          }
        </div>

        {/* Goal progress line graph */}
        {goals.length>0&&<LineGraph
          title="🎯 Life Goal Progress"
          sub="Progress % for each of your yearly life goals."
          series={goalSeries.length?goalSeries:[{label:"No goals",data:[0,0]}]}
          yMax={100}
          height={180}
          colors={CATS.map(c=>c.color)}
          xLabels={["Start","Now"]}
        />}

        {/* Financial progress line */}
        {finGoals.length>0&&<LineGraph
          title="💰 Financial Goal Progress"
          sub="Savings % toward each financial goal."
          series={finSeries}
          yMax={100}
          height={180}
          colors={["#fbbf24","#34c98a","#4f9cf9","#c084fc","#f97b4f","#67e8f9"]}
          xLabels={["Start","Now"]}
        />}

        {/* Completed tasks summary */}
        <div style={{...S.card,marginBottom:20}}>
          <p style={S.title}>✅ Task Completion This Week</p>
          <p style={S.sub}>Tasks done vs. planned by day.</p>
          <svg viewBox="0 0 560 130" style={{width:"100%",height:130,overflow:"visible"}}>
            {DAYS.map((day,i)=>{
              const tasks=data.weekDays[day]?.tasks||[];
              const total=tasks.length;
              const done=tasks.filter(t=>t.done).length;
              const pct=total>0?done/total*100:0;
              const x=30+i*72;
              const maxH=80;
              const bH=Math.max(total>0?4:0,pct/100*maxH);
              const bgH=Math.max(total>0?4:0,maxH*(total>0?1:0));
              return <g key={day}>
                <rect x={x} y={20+(maxH-bgH)} width={44} height={bgH} rx="5" fill="rgba(255,255,255,0.05)"/>
                <rect x={x} y={20+(maxH-bH)} width={44} height={bH} rx="5" fill={pct===100?"#34c98a":pct>0?"#4f9cf9":"rgba(255,255,255,0.05)"}/>
                <text x={x+22} y={total>0?17:18} textAnchor="middle" fill={pct===100?"#34c98a":"rgba(255,255,255,0.4)"} fontSize="10" fontWeight="600">{total>0?`${done}/${total}`:""}</text>
                <text x={x+22} y={116} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9">{day.slice(0,3)}</text>
              </g>;
            })}
          </svg>
        </div>

        {/* Financial totals */}
        {finGoals.length>0&&(
          <div style={S.card}>
            <p style={S.title}>💰 Financial Summary</p>
            <p style={S.sub}>Savings toward all financial goals.</p>
            {finGoals.map(g=>{
              const pct=g.targetAmount>0?Math.min((g.saved||0)/g.targetAmount*100,100):0;
              return(
                <div key={g.id} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:13,color:"#fff",fontWeight:600}}>{finCatIcon(g.category)} {g.name}</span>
                    <span style={{fontSize:14,fontWeight:700,color:"#fbbf24"}}>{fmt$(g.saved||0)} / {fmt$(g.targetAmount)}</span>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.06)",borderRadius:20,height:8,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,#fbbf24,#34c98a)`,borderRadius:20,transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:3}}>{Math.round(pct)}% funded{g.deadline?` · Due ${new Date(g.deadline).toLocaleDateString()}`:""}  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  INSPIRATION (PRO)
  // ────────────────────────────────────────────────────────────────
  const INSPO_CATS=[
    {id:"motivation",label:"Motivation",icon:"🔥"},
    {id:"scripture",label:"Scripture",icon:"📖"},
    {id:"speech",label:"Speech / Talk",icon:"🎤"},
    {id:"leadership",label:"Leadership",icon:"⚡"},
    {id:"finance",label:"Financial Wisdom",icon:"💰"},
    {id:"health",label:"Health & Body",icon:"💪"},
    {id:"mindset",label:"Mindset",icon:"🧠"},
    {id:"faith",label:"Faith",icon:"✨"},
    {id:"personal",label:"Personal",icon:"🌱"},
  ];
  const INSPO_TYPES=[{id:"quote",icon:"💬"},{id:"scripture",icon:"📖"},{id:"speech",icon:"🎤"},{id:"affirmation",icon:"🌟"}];

  const renderInspiration=()=>{
    if(!isPro)return<Lock onUpgrade={goPro} msg="The Inspiration Library is a Pro feature. Store your favorite quotes, scriptures, speeches, and affirmations."/>;
    const items=data.inspiration||[];
    const filtered=inspoFilter==="all"?items:items.filter(i=>i.category===inspoFilter||i.type===inspoFilter);
    const daily=items.length>0?items[new Date().getDate()%items.length]:null;
    return(
      <div>
        {/* Daily */}
        {daily&&(
          <div style={{...S.card,marginBottom:22,background:"linear-gradient(135deg,rgba(192,132,252,0.08),rgba(79,156,249,0.06))",borderColor:"rgba(192,132,252,0.25)",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,right:0,fontSize:80,opacity:0.06,lineHeight:1,pointerEvents:"none"}}>💡</div>
            <div style={{fontSize:11,color:"#c084fc",letterSpacing:"2px",textTransform:"uppercase",marginBottom:12,fontWeight:700}}>Today's Inspiration</div>
            <div style={{fontFamily:"'Syne',serif",fontSize:18,color:"#fff",lineHeight:1.6,marginBottom:10,fontStyle:"italic"}}>"{daily.text}"</div>
            {daily.author&&<div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>— {daily.author}</div>}
            <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:6,background:"rgba(192,132,252,0.1)",border:"1px solid rgba(192,132,252,0.2)",borderRadius:6,padding:"3px 10px",fontSize:11,color:"#c084fc"}}>
              {INSPO_CATS.find(c=>c.id===daily.category)?.icon||"💡"} {INSPO_CATS.find(c=>c.id===daily.category)?.label||daily.category}
            </div>
          </div>
        )}
        {/* Add form */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div><h2 style={{...S.title,fontSize:20,margin:0}}>💡 Inspiration Library</h2><p style={{margin:"4px 0 0",color:"rgba(255,255,255,0.35)",fontSize:13}}>Your personal collection of quotes, scriptures, speeches, and affirmations.</p></div>
          <button onClick={()=>setShowInspoForm(p=>!p)} style={S.btn("#c084fc")}>+ Add</button>
        </div>
        {showInspoForm&&(
          <div style={{...S.card,marginBottom:20,borderColor:"rgba(192,132,252,0.3)",background:"rgba(192,132,252,0.04)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={S.lbl}>Type</label>
                <select value={newInspo.type} onChange={e=>setNewInspo(p=>({...p,type:e.target.value}))} style={{...S.sel,width:"100%"}}>
                  {INSPO_TYPES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.id.charAt(0).toUpperCase()+t.id.slice(1)}</option>)}
                </select>
              </div>
              <div><label style={S.lbl}>Category</label>
                <select value={newInspo.category} onChange={e=>setNewInspo(p=>({...p,category:e.target.value}))} style={{...S.sel,width:"100%"}}>
                  {INSPO_CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:12}}><label style={S.lbl}>Text / Content</label>
              <textarea placeholder="Enter the quote, scripture reference, speech excerpt, or affirmation..." value={newInspo.text} onChange={e=>setNewInspo(p=>({...p,text:e.target.value}))} style={{...S.inp,minHeight:90,resize:"vertical",lineHeight:1.7}}/>
            </div>
            <div style={{marginBottom:14}}><label style={S.lbl}>Author / Source (optional)</label>
              <input placeholder="e.g. Alma 37:6, Steve Jobs 2005 Stanford Speech, Romans 8:28" value={newInspo.author} onChange={e=>setNewInspo(p=>({...p,author:e.target.value}))} style={S.inp}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{
                if(!newInspo.text.trim())return;
                upd(p=>({...p,inspiration:[{...newInspo,id:uid(),addedAt:new Date().toLocaleDateString()},...(p.inspiration||[])]}));
                setNewInspo({type:"quote",text:"",author:"",category:"motivation"});
                setShowInspoForm(false);
              }} style={S.btn("#c084fc")}>Save</button>
              <button onClick={()=>setShowInspoForm(false)} style={S.btn("rgba(255,255,255,0.1)")}>Cancel</button>
            </div>
          </div>
        )}
        {/* Filter */}
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {["all",...INSPO_TYPES.map(t=>t.id)].map(f=>(
            <button key={f} onClick={()=>setInspoFilter(f)} style={{padding:"6px 14px",border:`1px solid ${inspoFilter===f?"rgba(192,132,252,0.5)":"rgba(255,255,255,0.08)"}`,borderRadius:20,background:inspoFilter===f?"rgba(192,132,252,0.12)":"transparent",color:inspoFilter===f?"#c084fc":"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",textTransform:"capitalize"}}>
              {f==="all"?"All":INSPO_TYPES.find(t=>t.id===f)?.icon+" "+f}
            </button>
          ))}
        </div>
        {/* Items */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
          {filtered.map(item=>(
            <div key={item.id} style={{...S.card,borderLeft:"3px solid #c084fc",position:"relative"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{display:"flex",gap:7}}>
                  <span style={{fontSize:16}}>{INSPO_TYPES.find(t=>t.id===item.type)?.icon||"💬"}</span>
                  <span style={{background:"rgba(192,132,252,0.1)",border:"1px solid rgba(192,132,252,0.2)",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#c084fc",fontWeight:600}}>{INSPO_CATS.find(c=>c.id===item.category)?.icon} {INSPO_CATS.find(c=>c.id===item.category)?.label||item.category}</span>
                </div>
                <button onClick={()=>upd(p=>({...p,inspiration:(p.inspiration||[]).filter(x=>x.id!==item.id)}))} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:15}}>✕</button>
              </div>
              <div style={{fontFamily:"'Syne',serif",fontSize:14,color:"#f0ece4",lineHeight:1.7,marginBottom:10,fontStyle:"italic"}}>"{item.text}"</div>
              {item.author&&<div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>— {item.author}</div>}
            </div>
          ))}
          {!filtered.length&&<div style={{...S.card,textAlign:"center",padding:48,color:"rgba(255,255,255,0.25)",fontStyle:"italic",gridColumn:"1/-1"}}>No inspiration saved yet. Add your first quote, scripture, or speech above.</div>}
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  PLANNING WIZARD MODAL
  // ────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────
  //  PLANNING WIZARD MODAL
  // ────────────────────────────────────────────────────────────────
  const renderPlanningWizard=()=>{
    if(!planningWizardStep)return null;
    const goals=data.yearlyGoals;
    const finGoals=data.financialGoals||[];
    const isReview=planningWizardMode==="review";
    const totalSteps=goals.length+finGoals.length+1; // +1 for summary/reflection
    const step=planningWizardStep;
    const isGoalStep=step<=goals.length;
    const isFinStep=step>goals.length&&step<=goals.length+finGoals.length;
    const isFinalStep=step>goals.length+finGoals.length;
    const goalIdx=step-1;
    const finIdx=step-goals.length-1;
    const goal=isGoalStep?goals[goalIdx]:null;
    const finGoal=isFinStep?finGoals[finIdx]:null;

    const next=()=>{ if(step<totalSteps)setPlanningWizardStep(s=>s+1); else { setPlanningWizardStep(0); if(isReview)setTab("reflection"); }};
    const prev=()=>{ if(step>1)setPlanningWizardStep(s=>s-1); };

    return(
      <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&setPlanningWizardStep(0)}>
        <div style={{background:"#0f1117",borderRadius:24,border:"1px solid rgba(255,255,255,0.1)",padding:36,maxWidth:600,width:"100%",maxHeight:"90vh",overflow:"auto",boxShadow:"0 0 60px rgba(79,156,249,0.1)"}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <div style={{fontSize:11,color:"#4f9cf9",letterSpacing:"2px",textTransform:"uppercase",fontWeight:700,marginBottom:4}}>
                {isReview?"📋 Weekly Review":"🗓️ Weekly Planning"} · Step {step} of {totalSteps}
              </div>
              <div style={{background:"rgba(255,255,255,0.07)",borderRadius:30,height:4,width:240,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(step/totalSteps)*100}%`,background:"linear-gradient(90deg,#4f9cf9,#34c98a)",transition:"width 0.4s ease"}}/>
              </div>
            </div>
            <button onClick={()=>setPlanningWizardStep(0)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:20}}>✕</button>
          </div>

          {/* Life Goal step */}
          {isGoalStep&&goal&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <Tag catId={goal.category}/>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>Life Goal {goalIdx+1} of {goals.length}</span>
              </div>
              <div style={{fontFamily:"'Syne',serif",fontSize:22,color:"#fff",fontWeight:700,marginBottom:6}}>{goal.title}</div>
              {goal.description&&<div style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginBottom:16,lineHeight:1.6}}>{goal.description}</div>}
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Progress</span><span style={{fontSize:14,fontWeight:700,color:cc(goal.category)}}>{goal.progress}%</span></div>
                <Bar pct={goal.progress} color={cc(goal.category)} h={10}/>
              </div>
              {goal.steps?.length>0&&(
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>Milestones ({goal.steps.filter(s=>s.done).length}/{goal.steps.length})</div>
                  {goal.steps.map(s=>(
                    <div key={s.id} onClick={()=>togStep(goal.id,s.id)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,marginBottom:5,cursor:"pointer",background:"rgba(255,255,255,0.03)"}}>
                      <div style={{width:15,height:15,borderRadius:4,flexShrink:0,border:`2px solid ${s.done?cc(goal.category):"rgba(255,255,255,0.2)"}`,background:s.done?cc(goal.category):"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{s.done&&<span style={{color:"#000",fontSize:9}}>✓</span>}</div>
                      <span style={{fontSize:13,color:s.done?"rgba(255,255,255,0.35)":"#fff",textDecoration:s.done?"line-through":"none"}}>{s.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <label style={{...S.lbl,color:cc(goal.category)}}>{isReview?"How did this go this week?":"This Week's Step"}</label>
                <textarea placeholder={isReview?"Reflect on progress…":"What specific action will you take this week?"} value={goal.weekSteps} onChange={e=>updGoal(goal.id,"weekSteps",e.target.value)} style={{...S.inp,minHeight:80,resize:"vertical",lineHeight:1.6,borderColor:`${cc(goal.category)}30`}}/>
              </div>
              {isReview&&(
                <div style={{marginTop:12}}>
                  <label style={S.lbl}>Update progress</label>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <input type="range" min="0" max="100" value={goal.progress} onChange={e=>updGoal(goal.id,"progress",parseInt(e.target.value))} style={{flex:1,accentColor:cc(goal.category)}}/>
                    <span style={{fontSize:16,fontWeight:700,color:cc(goal.category),minWidth:38}}>{goal.progress}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Financial Goal step */}
          {isFinStep&&finGoal&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <span style={{background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:6,padding:"3px 10px",fontSize:11,color:"#fbbf24",fontWeight:700}}>{finCatIcon(finGoal.category)} {finCatLabel(finGoal.category)}</span>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>Financial Goal {finIdx+1} of {finGoals.length}</span>
              </div>
              <div style={{fontFamily:"'Syne',serif",fontSize:22,color:"#fff",fontWeight:700,marginBottom:16}}>{finGoal.name}</div>
              <div style={{background:"rgba(251,191,36,0.06)",borderRadius:12,padding:"14px 18px",marginBottom:16,border:"1px solid rgba(251,191,36,0.15)"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:12,textAlign:"center"}}>
                  <div><div style={{fontSize:24,fontWeight:800,color:"#fbbf24"}}>{fmt$(finGoal.saved||0)}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>Saved</div></div>
                  <div><div style={{fontSize:24,fontWeight:800,color:"#fff"}}>{fmt$(finGoal.targetAmount)}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>Target</div></div>
                </div>
                <Bar pct={finGoal.targetAmount>0?(finGoal.saved||0)/finGoal.targetAmount*100:0} color="#fbbf24" h={8}/>
              </div>
              {isReview&&(
                <div>
                  <label style={{...S.lbl,color:"#fbbf24"}}>Add this week's deposit</label>
                  <div style={{display:"flex",gap:8}}>
                    <input type="number" placeholder="Amount $" value={depositInput[finGoal.id]?.amount||""} onChange={e=>setDepositInput(p=>({...p,[finGoal.id]:{...p[finGoal.id],amount:e.target.value}}))} style={{...S.inp,flex:1}}/>
                    <input placeholder="Note" value={depositInput[finGoal.id]?.note||""} onChange={e=>setDepositInput(p=>({...p,[finGoal.id]:{...p[finGoal.id],note:e.target.value}}))} style={{...S.inp,flex:2}}/>
                    <button onClick={()=>{addDeposit(finGoal.id,depositInput[finGoal.id]?.amount,depositInput[finGoal.id]?.note||"");setDepositInput(p=>({...p,[finGoal.id]:{amount:"",note:""}}));}} style={{...S.btn("#fbbf24","#000"),padding:"10px 14px"}}>+</button>
                  </div>
                </div>
              )}
              {!isReview&&finGoal.notes&&<div style={{fontSize:13,color:"rgba(255,255,255,0.4)",fontStyle:"italic",lineHeight:1.6}}>{finGoal.notes}</div>}
            </div>
          )}

          {/* Final step */}
          {isFinalStep&&(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:56,marginBottom:16}}>{isReview?"🎉":"🚀"}</div>
              <div style={{fontFamily:"'Syne',serif",fontSize:24,fontWeight:800,color:"#fff",marginBottom:10}}>
                {isReview?"Week Review Complete!":"Week Planned!"}
              </div>
              <div style={{fontSize:14,color:"rgba(255,255,255,0.45)",lineHeight:1.7,marginBottom:24}}>
                {isReview
                  ?"Great work reflecting on your week. Head to the Reflection tab to write your full weekly reflection and rate your week."
                  :"You've set your focus for every goal this week. Head to your Weekly Plan to add your tasks."}
              </div>
              {isReview?(
                <button onClick={()=>{setPlanningWizardStep(0);setTab("reflection");}} style={{...S.btn("#34c98a"),fontSize:14,padding:"12px 28px"}}>Write Reflection →</button>
              ):(
                <button onClick={()=>{setPlanningWizardStep(0);setTab("weekly");}} style={{...S.btn("#4f9cf9"),fontSize:14,padding:"12px 28px"}}>Go to Weekly Plan →</button>
              )}
            </div>
          )}

          {/* Nav buttons */}
          {!isFinalStep&&(
            <div style={{display:"flex",justifyContent:"space-between",marginTop:24}}>
              <button onClick={prev} disabled={step===1} style={{...S.btn("rgba(255,255,255,0.08)"),opacity:step===1?0.3:1}}>← Previous</button>
              <button onClick={next} style={{...S.btn("#4f9cf9"),padding:"10px 28px"}}>
                {step===totalSteps-1?"Finish →":"Next →"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  PRO DAILY PLANNER WIZARD
  // ────────────────────────────────────────────────────────────────
  const renderDailyPlannerWizard=()=>{
    if(!showDailyPlanner)return null;
    const day=DAYS[dailyPlannerDay];
    const dayTasks=data.weekDays[day]?.tasks||[];
    const dayEvents=data.weekDays[day]?.events||[];
    const goalSteps=data.yearlyGoals.filter(g=>g.weekSteps);
    const isLast=dailyPlannerDay===6;
    const isFirst=dailyPlannerDay===0;
    const progress=Math.round(((dailyPlannerDay+1)/7)*100);

    const dpAddTask=()=>{
      if(!dpNewTask.title.trim())return;
      const taskBase={...dpNewTask,id:uid(),done:false};
      upd(p=>{
        const wd={...p.weekDays};
        if(dpNewTask.repeat==="daily"){
          DAYS.forEach(d=>{ wd[d]={...wd[d],tasks:[...(wd[d]?.tasks||[]),{...taskBase,id:uid()}]}; });
        } else {
          wd[day]={...wd[day],tasks:[...(wd[day]?.tasks||[]),taskBase]};
        }
        return{...p,weekDays:wd};
      });
      setDpNewTask({time:"9:00 AM",title:"",category:"intellectual",notes:"",repeat:"none"});
    };
    const dpDelTask=(id)=>upd(p=>{const wd={...p.weekDays};wd[day]={...wd[day],tasks:wd[day].tasks.filter(t=>t.id!==id)};return{...p,weekDays:wd};});

    const dpAddEvent=()=>{
      if(!dpNewEvent.title.trim())return;
      const evBase={...dpNewEvent,id:uid(),date:new Date().toISOString().slice(0,10),repeat:"none"};
      upd(p=>{
        const wd={...p.weekDays};
        wd[day]={...wd[day],events:[...(wd[day]?.events||[]),evBase]};
        return{...p,weekDays:wd};
      });
      setDpNewEvent({title:"",startTime:"9:00 AM",endTime:"10:00 AM",type:"work",notes:""});
    };
    const dpDelEvent=(id)=>upd(p=>{const wd={...p.weekDays};wd[day]={...wd[day],events:(wd[day].events||[]).filter(e=>e.id!==id)};return{...p,weekDays:wd};});

    const EVENT_TYPES_LOCAL=[
      {id:"work",label:"Work",color:"#4f9cf9",icon:"💼"},
      {id:"school",label:"School",color:"#c084fc",icon:"📚"},
      {id:"personal",label:"Personal",color:"#34c98a",icon:"🏠"},
      {id:"health",label:"Health",color:"#f97b4f",icon:"🏃"},
      {id:"social",label:"Social",color:"#fbbf24",icon:"🤝"},
      {id:"other",label:"Other",color:"#94a3b8",icon:"📌"},
    ];

    return(
      <div style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&setShowDailyPlanner(false)}>
        <div style={{background:"#0f1117",borderRadius:24,border:"1px solid rgba(79,156,249,0.25)",padding:0,maxWidth:680,width:"100%",maxHeight:"92vh",overflow:"hidden",boxShadow:"0 0 80px rgba(79,156,249,0.12)",display:"flex",flexDirection:"column"}}>
          {/* Header */}
          <div style={{padding:"24px 28px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontSize:11,color:"#4f9cf9",letterSpacing:"2px",textTransform:"uppercase",fontWeight:700,marginBottom:3}}>★ Pro Weekly Planner · Day {dailyPlannerDay+1} of 7</div>
                <div style={{fontFamily:"'Syne',serif",fontSize:22,fontWeight:800,color:"#fff"}}>{day}</div>
              </div>
              <button onClick={()=>setShowDailyPlanner(false)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:22,lineHeight:1}}>✕</button>
            </div>
            {/* Progress bar */}
            <div style={{background:"rgba(255,255,255,0.07)",borderRadius:30,height:5,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#4f9cf9,#34c98a)",transition:"width 0.4s ease"}}/>
            </div>
            {/* Day pills */}
            <div style={{display:"flex",gap:6,marginTop:12,overflowX:"auto"}}>
              {DAYS.map((d,i)=>(
                <button key={d} onClick={()=>setDailyPlannerDay(i)} style={{padding:"5px 10px",borderRadius:20,border:"none",background:i===dailyPlannerDay?"#4f9cf9":"rgba(255,255,255,0.07)",color:i===dailyPlannerDay?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:11,fontWeight:i===dailyPlannerDay?700:400,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.2s"}}>
                  {d.slice(0,3)} {(data.weekDays[d]?.tasks||[]).length+(data.weekDays[d]?.events||[]).length>0?"✓":""}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{flex:1,overflow:"auto",padding:"20px 28px"}}>
            {/* Goal steps for this day */}
            {goalSteps.length>0&&(
              <div style={{marginBottom:16,background:"rgba(52,201,138,0.06)",borderRadius:12,padding:"12px 16px",border:"1px solid rgba(52,201,138,0.15)"}}>
                <div style={{fontSize:10,color:"#34c98a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8,fontWeight:700}}>🎯 Goal Steps This Week</div>
                {goalSteps.slice(0,3).map(g=>(
                  <div key={g.id} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
                    <Tag catId={g.category}/>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>{g.weekSteps}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Events section */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:700,color:"#c084fc",letterSpacing:"1px",textTransform:"uppercase",marginBottom:10}}>📅 Events & Appointments</div>
              {dayEvents.length===0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.2)",fontStyle:"italic",marginBottom:8}}>No events yet for {day}.</div>}
              {dayEvents.map(ev=>{
                const et=EVENT_TYPES_LOCAL.find(x=>x.id===ev.type)||EVENT_TYPES_LOCAL[0];
                return(
                  <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,background:`${et.color}12`,borderRadius:9,padding:"8px 12px",marginBottom:6,border:`1px solid ${et.color}28`}}>
                    <span style={{fontSize:15}}>{et.icon}</span>
                    <span style={{flex:1,fontSize:13,color:"#fff"}}>{ev.title}</span>
                    <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{ev.startTime}–{ev.endTime}</span>
                    <button onClick={()=>dpDelEvent(ev.id)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:14}}>×</button>
                  </div>
                );
              })}
              {/* Quick add event */}
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
                <input placeholder="Event title…" value={dpNewEvent.title} onChange={e=>setDpNewEvent(p=>({...p,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&dpAddEvent()} style={{...S.inp,fontSize:12,flex:"1 1 160px",minWidth:120}}/>
                <TimeInput value={dpNewEvent.startTime} onChange={v=>setDpNewEvent(p=>({...p,startTime:v}))}/>
                <TimeInput value={dpNewEvent.endTime} onChange={v=>setDpNewEvent(p=>({...p,endTime:v}))}/>
                <select value={dpNewEvent.type} onChange={e=>setDpNewEvent(p=>({...p,type:e.target.value}))} style={{...S.sel,fontSize:11,flex:"0 0 auto"}}>
                  {EVENT_TYPES_LOCAL.map(et=><option key={et.id} value={et.id}>{et.icon} {et.label}</option>)}
                </select>
                <button onClick={dpAddEvent} style={{...S.btn("#c084fc"),padding:"8px 12px",fontWeight:800}}>+</button>
              </div>
            </div>

            {/* Tasks section */}
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"#4f9cf9",letterSpacing:"1px",textTransform:"uppercase",marginBottom:10}}>✅ Tasks for {day}</div>
              {dayTasks.length===0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.2)",fontStyle:"italic",marginBottom:8}}>No tasks yet for {day}.</div>}
              {dayTasks.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.03)",borderRadius:9,padding:"8px 12px",marginBottom:6,border:`1px solid ${cc(t.category)}22`}}>
                  <Tag catId={t.category}/>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.35)",minWidth:50}}>{t.time}</span>
                  <span style={{flex:1,fontSize:13,color:"#fff"}}>{t.title}</span>
                  {t.repeat&&t.repeat!=="none"&&<span style={{fontSize:9,color:"#4f9cf9",background:"rgba(79,156,249,0.12)",borderRadius:4,padding:"2px 6px"}}>🔁 {t.repeat}</span>}
                  <button onClick={()=>dpDelTask(t.id)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:14}}>×</button>
                </div>
              ))}
              {/* Quick add task */}
              <div style={{display:"flex",gap:6,marginTop:8,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                <TimeInput value={dpNewTask.time} onChange={v=>setDpNewTask(p=>({...p,time:v}))}/>
                <input placeholder="Task title…" value={dpNewTask.title} onChange={e=>setDpNewTask(p=>({...p,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&dpAddTask()} style={{...S.inp,fontSize:12,flex:"1 1 140px",minWidth:100}}/>
                <select value={dpNewTask.category} onChange={e=>setDpNewTask(p=>({...p,category:e.target.value}))} style={{...S.sel,flex:"0 0 auto"}}>
                  {CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
                <select value={dpNewTask.repeat} onChange={e=>setDpNewTask(p=>({...p,repeat:e.target.value}))} style={{...S.sel,fontSize:11,flex:"0 0 auto"}}>
                  <option value="none">Once</option>
                  <option value="daily">Daily 🔁</option>
                  <option value="weekly">Weekly 🔁</option>
                </select>
                <button onClick={dpAddTask} style={{...S.btn("#4f9cf9"),padding:"8px 12px",fontWeight:800}}>+</button>
              </div>
            </div>
          </div>

          {/* Footer nav */}
          <div style={{padding:"16px 28px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:"rgba(8,9,13,0.6)"}}>
            <button onClick={()=>setDailyPlannerDay(p=>Math.max(0,p-1))} disabled={isFirst} style={{...S.btn("rgba(255,255,255,0.08)"),opacity:isFirst?0.3:1}}>← {isFirst?"":DAYS[dailyPlannerDay-1]?.slice(0,3)}</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>
                {dayTasks.length} task{dayTasks.length!==1?"s":""} · {dayEvents.length} event{dayEvents.length!==1?"s":""}
              </div>
            </div>
            {isLast?(
              <button onClick={()=>{setShowDailyPlanner(false);setTab("weekly");upd(p=>({...p,achievementStats:{...p.achievementStats,proWizardUsed:(p.achievementStats?.proWizardUsed||0)+1}}));}} style={{...S.btn("#34c98a"),fontWeight:700}}>✓ Done Planning!</button>
            ):(
              <button onClick={()=>setDailyPlannerDay(p=>p+1)} style={{...S.btn("#4f9cf9")}}>{DAYS[dailyPlannerDay+1]?.slice(0,3)} →</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  SUNDAY REFLECTION POPUP (full inline form)
  // ────────────────────────────────────────────────────────────────
  const renderSundayPopup=()=>{
    if(!showSundayReflection)return null;
    const ref=data.currentReflection;
    const setRef=(field,val)=>upd(p=>({...p,currentReflection:{...p.currentReflection,[field]:val}}));
    const saveAndClose=()=>{
      const entry={...data.currentReflection,date:new Date().toLocaleDateString(),week:getMon().toLocaleDateString()};
      upd(p=>({...p,reflections:[entry,...(p.reflections||[])],currentReflection:{wentWell:"",improve:"",catNotes:{},rating:7,commitment:""}}));
      setShowSundayReflection(false);
    };
    return(
      <div style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
        <div style={{background:"#0d0f14",borderRadius:24,border:"1px solid rgba(52,201,138,0.3)",padding:36,maxWidth:680,width:"100%",boxShadow:"0 0 80px rgba(52,201,138,0.1)",maxHeight:"92vh",overflowY:"auto"}}>
          {/* Header */}
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:52,marginBottom:10}}>🌅</div>
            <div style={{fontFamily:"'Syne',serif",fontSize:26,fontWeight:800,color:"#fff",marginBottom:6}}>Sunday Reflection</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.6}}>
              Take a few minutes to reflect on this week — celebrate your wins, be honest about what to improve, and commit to your focus for next week.
            </div>
            <div style={{marginTop:12,fontSize:11,color:"rgba(52,201,138,0.7)",letterSpacing:"2px",textTransform:"uppercase",fontWeight:700}}>Week of {getMon().toLocaleDateString()}</div>
          </div>

          {/* Week rating - prominent */}
          <div style={{...{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:20},marginBottom:16,textAlign:"center"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:10}}>How was your week overall?</div>
            <div style={{marginBottom:8}}>
              <span style={{fontSize:52,fontWeight:800,color:ref.rating>=8?"#34c98a":ref.rating>=5?"#4f9cf9":"#f97b4f"}}>{ref.rating}</span>
              <span style={{fontSize:20,color:"rgba(255,255,255,0.25)"}}>/10</span>
            </div>
            <input type="range" min="1" max="10" value={ref.rating} onChange={e=>setRef("rating",parseInt(e.target.value))} style={{width:"80%",accentColor:"#4f9cf9",maxWidth:320}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:4,maxWidth:320,margin:"4px auto 0"}}>
              <span>1 — Tough week</span><span>10 — Amazing!</span>
            </div>
          </div>

          {/* What went well / improve */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={{background:"rgba(52,201,138,0.05)",border:"1px solid rgba(52,201,138,0.15)",borderRadius:14,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"#34c98a",marginBottom:8}}>✅ What went well?</div>
              <textarea placeholder="Celebrate your wins this week…" value={ref.wentWell} onChange={e=>setRef("wentWell",e.target.value)} style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(52,201,138,0.2)",borderRadius:9,color:"#f0ece4",padding:"10px 13px",fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box",minHeight:100,resize:"vertical",lineHeight:1.7}}/>
            </div>
            <div style={{background:"rgba(249,123,79,0.05)",border:"1px solid rgba(249,123,79,0.15)",borderRadius:14,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"#f97b4f",marginBottom:8}}>🔄 What could be better?</div>
              <textarea placeholder="Honest, kind self-reflection…" value={ref.improve} onChange={e=>setRef("improve",e.target.value)} style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(249,123,79,0.2)",borderRadius:9,color:"#f0ece4",padding:"10px 13px",fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box",minHeight:100,resize:"vertical",lineHeight:1.7}}/>
            </div>
          </div>

          {/* Category check-in */}
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:16,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.7)",marginBottom:12}}>📋 Category Check-In <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:400}}>(optional — one sentence each)</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {CATS.map(cat=>(
                <div key={cat.id} style={{background:cat.light,borderRadius:10,padding:12,border:`1px solid ${cat.color}22`}}>
                  <div style={{fontSize:12,fontWeight:600,color:cat.color,marginBottom:6}}>{cat.icon} {cat.label}</div>
                  <textarea placeholder={`${cat.label} this week…`} value={(ref.catNotes||{})[cat.id]||""} onChange={e=>upd(p=>({...p,currentReflection:{...p.currentReflection,catNotes:{...(p.currentReflection.catNotes||{}),[cat.id]:e.target.value}}}))} style={{background:"rgba(0,0,0,0.25)",border:`1px solid ${cat.color}20`,borderRadius:7,color:"#f0ece4",padding:"8px 10px",fontSize:11,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box",minHeight:52,resize:"none",lineHeight:1.6}}/>
                </div>
              ))}
            </div>
          </div>

          {/* Next week commitment */}
          <div style={{background:"rgba(79,156,249,0.05)",border:"1px solid rgba(79,156,249,0.15)",borderRadius:14,padding:16,marginBottom:24}}>
            <div style={{fontSize:13,fontWeight:700,color:"#4f9cf9",marginBottom:8}}>💡 Next Week's #1 Commitment</div>
            <textarea placeholder="Next week I will focus on…" value={ref.commitment} onChange={e=>setRef("commitment",e.target.value)} style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(79,156,249,0.2)",borderRadius:9,color:"#f0ece4",padding:"10px 13px",fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box",minHeight:72,resize:"vertical",lineHeight:1.7}}/>
          </div>

          {/* Actions */}
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <button onClick={saveAndClose} style={{flex:1,background:"#34c98a",border:"none",color:"#000",padding:"14px 24px",borderRadius:10,cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>
              💾 Save & Close
            </button>
            <button onClick={()=>{setShowSundayReflection(false);setPlanningWizardMode("review");setPlanningWizardStep(1);}} style={{background:"rgba(79,156,249,0.15)",border:"1px solid rgba(79,156,249,0.3)",color:"#4f9cf9",padding:"14px 20px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>
              📋 Review Goals Too
            </button>
          </div>
          <button onClick={()=>{setShowSundayReflection(false);setSundayDismissed(true);}} style={{display:"block",margin:"14px auto 0",background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>
            Skip for now
          </button>
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  LAYOUT
  // ────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────
  //  AI COACH CHATBOT (PRO)
  // ────────────────────────────────────────────────────────────────
  const renderAIChat=()=>{
    if(!isPro)return<Lock onUpgrade={goPro} msg="AI Coach is a Pro feature. Get personalized weekly planning advice, accountability support, and goal coaching powered by Claude AI."/>;
    const starters=[
      "Help me plan my week","How do I stay consistent?","I'm feeling stuck on a goal",
      "What should I focus on today?","Review my progress","Help me set a new goal",
      "I need motivation","How do I build better habits?",
    ];
    return(
      <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 200px)",minHeight:480}}>
        {/* Header */}
        <div style={{...S.card,marginBottom:14,borderColor:"rgba(79,156,249,0.25)",background:"rgba(79,156,249,0.04)",padding:"16px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#4f9cf9,#c084fc)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🤖</div>
            <div>
              <div style={{fontFamily:"'Syne',serif",fontSize:16,fontWeight:700,color:"#fff"}}>AI Planning Coach</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Powered by Claude · Knows your goals, KIs, and progress</div>
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,background:"rgba(52,201,138,0.12)",border:"1px solid rgba(52,201,138,0.3)",borderRadius:8,padding:"5px 10px"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#34c98a",animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:11,color:"#34c98a",fontWeight:600}}>Online</span>
            </div>
          </div>
        </div>

        {/* Quick starters */}
        {chatMessages.length===0&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8}}>Quick prompts</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {starters.map(s=>(
                <button key={s} onClick={()=>{setChatInput(s);}} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,color:"rgba(255,255,255,0.65)",padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"}}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message history */}
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12,paddingBottom:8}}>
          {chatMessages.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,0.25)"}}>
              <div style={{fontSize:36,marginBottom:10}}>🤖</div>
              <div style={{fontSize:14,fontStyle:"italic"}}>Hi {authUser?.name?.split(" ")[0]}! I'm your AI planning coach.<br/>Ask me anything about your goals, habits, or planning.</div>
            </div>
          )}
          {chatMessages.map(msg=>(
            <div key={msg.id} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",gap:10,alignItems:"flex-end"}}>
              {msg.role==="assistant"&&<div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#4f9cf9,#c084fc)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,marginBottom:2}}>🤖</div>}
              <div style={{
                maxWidth:"78%",padding:"12px 16px",borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                background:msg.role==="user"?"linear-gradient(135deg,#4f9cf9,#3b7de8)":"rgba(255,255,255,0.06)",
                border:msg.role==="user"?"none":"1px solid rgba(255,255,255,0.1)",
                color:"#f0ece4",fontSize:13,lineHeight:1.65,
              }}>
                {msg.content}
              </div>
              {msg.role==="user"&&<div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#34c98a,#2da876)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,marginBottom:2,fontWeight:700,color:"#000"}}>{authUser?.name?.charAt(0)?.toUpperCase()}</div>}
            </div>
          ))}
          {chatLoading&&(
            <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
              <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#4f9cf9,#c084fc)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
              <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"16px 16px 16px 4px",padding:"14px 18px",display:"flex",gap:5,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#4f9cf9",animation:`pulse 1.2s ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={chatEndRef}/>
        </div>

        {/* Input bar */}
        <div style={{display:"flex",gap:10,marginTop:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"8px 8px 8px 16px",alignItems:"flex-end"}}>
          <textarea
            value={chatInput}
            onChange={e=>setChatInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChatMessage();}}}
            placeholder="Ask your planning coach anything… (Enter to send)"
            rows={2}
            style={{flex:1,background:"transparent",border:"none",color:"#f0ece4",fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none",resize:"none",lineHeight:1.6,padding:"4px 0"}}
          />
          <button onClick={sendChatMessage} disabled={!chatInput.trim()||chatLoading} style={{
            background:chatInput.trim()&&!chatLoading?"linear-gradient(135deg,#4f9cf9,#3b7de8)":"rgba(255,255,255,0.08)",
            border:"none",color:chatInput.trim()&&!chatLoading?"#fff":"rgba(255,255,255,0.3)",
            width:40,height:40,borderRadius:10,cursor:chatInput.trim()&&!chatLoading?"pointer":"default",
            fontSize:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",
          }}>➤</button>
        </div>
        {chatMessages.length>0&&(
          <button onClick={()=>setChatMessages([])} style={{display:"block",margin:"8px auto 0",background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>
            Clear conversation
          </button>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  MORNING INSPIRATION POPUP
  // ────────────────────────────────────────────────────────────────
  const renderMorningInspo=()=>{
    if(!showMorningInspo||!morningInspo)return null;
    const typeIcon={quote:"💬",scripture:"📖",speech:"🎤",affirmation:"🌟"}[morningInspo.type]||"💡";
    return(
      <div style={{position:"fixed",inset:0,zIndex:800,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:"linear-gradient(145deg,#0d0f14,#12151c)",borderRadius:24,border:"1px solid rgba(192,132,252,0.3)",padding:40,maxWidth:520,width:"100%",boxShadow:"0 0 80px rgba(192,132,252,0.12)",textAlign:"center",animation:"slideUp 0.5s cubic-bezier(.16,1,.3,1)"}}>
          <div style={{fontSize:11,color:"rgba(192,132,252,0.8)",letterSpacing:"3px",textTransform:"uppercase",marginBottom:16,fontWeight:700}}>
            ☀️ Good Morning, {authUser?.name?.split(" ")[0]}
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.35)",marginBottom:20,letterSpacing:"1px",textTransform:"uppercase"}}>Today's Inspiration {typeIcon}</div>
          <div style={{fontFamily:"'Syne',serif",fontSize:22,fontWeight:700,color:"#f0ece4",lineHeight:1.6,marginBottom:morningInspo.author?16:28,fontStyle:"italic"}}>
            "{morningInspo.text}"
          </div>
          {morningInspo.author&&<div style={{fontSize:14,color:"rgba(255,255,255,0.45)",marginBottom:28}}>— {morningInspo.author}</div>}
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            <button onClick={()=>setShowMorningInspo(false)} style={{background:"linear-gradient(135deg,#c084fc,#9333ea)",border:"none",color:"#fff",padding:"13px 32px",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"'DM Sans',sans-serif",boxShadow:"0 4px 20px rgba(192,132,252,0.35)"}}>
              Start My Day 🚀
            </button>
            <button onClick={()=>{setShowMorningInspo(false);setTab("inspiration");}} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.6)",padding:"13px 20px",borderRadius:12,cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
              View Library
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  MY PROFILE
  // ────────────────────────────────────────────────────────────────
  const renderProfile=()=>{
    const prof=data.profile||{};
    const draft=profileDraft||prof;
    const topGoals=(data.yearlyGoals||[]).slice(0,3);
    const topKIs=(data.kis||[]).slice(0,3);
    const AVATAR_COLORS=["linear-gradient(135deg,#4f9cf9,#c084fc)","linear-gradient(135deg,#34c98a,#4f9cf9)","linear-gradient(135deg,#fbbf24,#f97b4f)","linear-gradient(135deg,#c084fc,#f97b4f)","linear-gradient(135deg,#34c98a,#fbbf24)","linear-gradient(135deg,#f97b4f,#c084fc)"];
    const saveProfile=()=>{
      upd(p=>({...p,profile:{...draft}}));
      // Sync name to auth
      const reg=JSON.parse(localStorage.getItem("up_users")||"{}");
      const fullName=`${draft.firstName||""} ${draft.lastName||""}`.trim();
      if(reg[authUser.email]){
        reg[authUser.email].firstName=draft.firstName||"";
        reg[authUser.email].lastName=draft.lastName||"";
        reg[authUser.email].name=fullName||reg[authUser.email].name;
        localStorage.setItem("up_users",JSON.stringify(reg));
      }
      setEditingProfile(false); setProfileDraft(null);
    };
    const startEdit=()=>{setProfileDraft({...prof,firstName:prof.firstName||authUser.firstName||authUser.name||"",lastName:prof.lastName||authUser.lastName||""});setEditingProfile(true);};

    if(editingProfile){
      return(
        <div style={{maxWidth:680,margin:"0 auto"}}>
          <div style={{...S.card,marginBottom:16}}>
            <p style={{...S.title,marginBottom:4}}>✏️ Edit Profile</p>
            {/* Avatar picker */}
            <div style={{marginBottom:20}}>
              <label style={S.lbl}>Profile Picture</label>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:10}}>
                <div style={{width:72,height:72,borderRadius:"50%",background:draft.avatarUrl?"transparent":draft.avatarColor||AVATAR_COLORS[0],border:"3px solid rgba(255,255,255,0.15)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:800,color:"#fff"}}>
                  {draft.avatarUrl?<img src={draft.avatarUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/>:(draft.firstName||"?").charAt(0).toUpperCase()}
                </div>
              <div style={{flex:1}}>
                  <input placeholder="Paste image URL (or upload below)" value={draft.avatarUrl||""} onChange={e=>setProfileDraft(p=>({...p,avatarUrl:e.target.value}))} style={{...S.inp,marginBottom:8,fontSize:12}}/>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:8}}>
                    <div style={{background:"rgba(79,156,249,0.1)",border:"1px dashed rgba(79,156,249,0.35)",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#4f9cf9",display:"flex",alignItems:"center",gap:5}}>📷 Upload Photo</div>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                      const file=e.target.files?.[0]; if(!file)return;
                      const reader=new FileReader();
                      reader.onload=ev=>setProfileDraft(p=>({...p,avatarUrl:ev.target.result}));
                      reader.readAsDataURL(file);
                    }}/>
                    {draft.avatarUrl&&<span style={{fontSize:11,color:"#34c98a"}}>✓ Photo set</span>}
                  </label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {AVATAR_COLORS.map((c,i)=>(
                      <div key={i} onClick={()=>setProfileDraft(p=>({...p,avatarColor:c,avatarUrl:""}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:draft.avatarColor===c&&!draft.avatarUrl?"3px solid #fff":"3px solid transparent",transition:"border 0.2s"}}/>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={S.lbl}>First Name</label><input value={draft.firstName||""} onChange={e=>setProfileDraft(p=>({...p,firstName:e.target.value}))} placeholder="First name" style={S.inp}/></div>
              <div><label style={S.lbl}>Last Name</label><input value={draft.lastName||""} onChange={e=>setProfileDraft(p=>({...p,lastName:e.target.value}))} placeholder="Last name" style={S.inp}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={S.lbl}>City / Town</label><input value={draft.city||""} onChange={e=>setProfileDraft(p=>({...p,city:e.target.value}))} placeholder="e.g. Provo" style={S.inp}/></div>
              <div><label style={S.lbl}>State</label><input value={draft.state||""} onChange={e=>setProfileDraft(p=>({...p,state:e.target.value}))} placeholder="e.g. Utah" style={S.inp}/></div>
            </div>
            <div style={{marginBottom:12}}><label style={S.lbl}>Hobbies</label><input value={draft.hobbies||""} onChange={e=>setProfileDraft(p=>({...p,hobbies:e.target.value}))} placeholder="Running, reading, cooking…" style={S.inp}/></div>
            <div style={{marginBottom:16}}><label style={S.lbl}>Bio</label><textarea value={draft.bio||""} onChange={e=>setProfileDraft(p=>({...p,bio:e.target.value}))} placeholder="Tell the community about yourself…" style={{...S.inp,minHeight:80,resize:"vertical"}}/></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={saveProfile} style={{...S.btn("#4f9cf9"),flex:1,fontWeight:700}}>💾 Save Profile</button>
              <button onClick={()=>{setEditingProfile(false);setProfileDraft(null);}} style={{...S.btn("rgba(255,255,255,0.08)"),flex:1,color:"rgba(255,255,255,0.5)"}}>Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    // Profile view
    const displayName=`${prof.firstName||authUser.firstName||authUser.name||""} ${prof.lastName||authUser.lastName||""}`.trim()||authUser.name;
    const initials=displayName.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"U";
    return(
      <div style={{maxWidth:760,margin:"0 auto"}}>
        {/* Profile hero card */}
        <div style={{...S.card,marginBottom:16,background:"linear-gradient(145deg,rgba(79,156,249,0.08),rgba(192,132,252,0.05))"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:20}}>
            {/* Avatar */}
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:90,height:90,borderRadius:"50%",background:prof.avatarUrl?"transparent":prof.avatarColor||AVATAR_COLORS[0],border:"3px solid rgba(255,255,255,0.15)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:800,color:"#fff",boxShadow:"0 0 30px rgba(79,156,249,0.3)"}}>
                {prof.avatarUrl?<img src={prof.avatarUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/>:initials}
              </div>
              {isPro&&<div style={{position:"absolute",bottom:-2,right:-2,background:"linear-gradient(135deg,#fbbf24,#d97706)",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,border:"2px solid #08090d"}}>★</div>}
            </div>
            {/* Info */}
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <div style={{fontFamily:"'Syne',serif",fontSize:22,fontWeight:800,color:"#fff"}}>{displayName}</div>
                {isPro&&<span style={{background:"linear-gradient(135deg,#fbbf24,#d97706)",color:"#000",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:800}}>★ PRO</span>}
              </div>
              {(prof.city||prof.state)&&<div style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginBottom:6}}>📍 {[prof.city,prof.state].filter(Boolean).join(", ")}</div>}
              {prof.bio&&<div style={{fontSize:13,color:"rgba(255,255,255,0.6)",lineHeight:1.6,marginBottom:8}}>{prof.bio}</div>}
              {prof.hobbies&&<div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>🎯 {prof.hobbies}</div>}
            </div>
            <button onClick={startEdit} style={{...S.btn("rgba(255,255,255,0.08)"),fontSize:12,color:"rgba(255,255,255,0.6)",flexShrink:0}}>✏️ Edit</button>
          </div>
          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:20,paddingTop:16,borderTop:"1px solid rgba(255,255,255,0.07)"}}>
            {[
              {label:"Overall Progress",value:`${overallPct()}%`,color:"#4f9cf9"},
              {label:"Goals Active",value:data.yearlyGoals.length,color:"#34c98a"},
              {label:"Achievements",value:earned.length,color:"#fbbf24"},
              {label:"Posts",value:(data.posts||[]).length,color:"#c084fc"},
            ].map(s=>(
              <div key={s.label} style={{textAlign:"center",background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"12px 8px",border:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{fontSize:22,fontWeight:800,color:s.color,fontFamily:"'Syne',serif"}}>{s.value}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {/* Goals pursuing */}
          <div style={S.card}>
            <p style={{...S.title,fontSize:14,marginBottom:12}}>🎯 Goals I'm Pursuing</p>
            {topGoals.length===0?<p style={{...S.sub,fontSize:12}}>No goals added yet.</p>:topGoals.map(g=>(
              <div key={g.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <Tag catId={g.category}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{g.title}</div>
                  <Bar pct={g.progress} color={cc(g.category)} h={4}/>
                </div>
                <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{g.progress}%</span>
              </div>
            ))}
          </div>
          {/* Key Indicators */}
          <div style={S.card}>
            <p style={{...S.title,fontSize:14,marginBottom:12}}>◎ Key Indicators</p>
            {topKIs.length===0?<p style={{...S.sub,fontSize:12}}>No KIs added yet.</p>:topKIs.map(k=>{
              const pct=Math.min(Math.round(kiTotal(k)/k.weeklyGoal*100),100);
              return(
                <div key={k.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <Tag catId={k.category}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{k.name}</div>
                    <Bar pct={pct} color={cc(k.category)} h={4}/>
                  </div>
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
        {!prof.firstName&&!prof.bio&&(
          <div style={{...S.card,marginTop:16,textAlign:"center",borderColor:"rgba(79,156,249,0.2)",background:"rgba(79,156,249,0.04)"}}>
            <div style={{fontSize:32,marginBottom:8}}>👤</div>
            <p style={{...S.title,marginBottom:4}}>Complete Your Profile</p>
            <p style={{...S.sub,marginBottom:14}}>Add your name, city, hobbies, and bio so friends can find you.</p>
            <button onClick={startEdit} style={{...S.btn("#4f9cf9"),padding:"10px 24px"}}>Set Up Profile →</button>
          </div>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  COMMUNITY / SOCIAL
  // ────────────────────────────────────────────────────────────────
  const renderSocial=()=>{
    const allUsers=JSON.parse(localStorage.getItem("up_users")||"{}");
    const myPosts=data.posts||[];
    const myFriends=data.friends||[];
    const myRequests=data.friendRequests||[];
    const prof=data.profile||{};
    const myName=`${prof.firstName||authUser.name} ${prof.lastName||""}`.trim();
    const myInitials=myName.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"U";

    // Gather all posts from all users for the feed
    const allPosts=[];
    Object.values(allUsers).forEach(u=>{
      const uData=loadData(u.id);
      if(uData?.posts){
        uData.posts.forEach(p=>allPosts.push({...p,
          authorId:u.id,authorName:`${uData.profile?.firstName||u.name} ${uData.profile?.lastName||""}`.trim()||u.name,
          authorInitials:(`${uData.profile?.firstName||u.name} ${uData.profile?.lastName||""}`).trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"?",
          authorAvatar:uData.profile?.avatarUrl||"",authorAvatarColor:uData.profile?.avatarColor||"linear-gradient(135deg,#4f9cf9,#c084fc)",
          authorIsPro:u.isPro||false,
          isMine:u.id===authUser.id,
        }));
      }
    });
    allPosts.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));

    // Sort posts by most likes, then by newest
    allPosts.sort((a,b)=>(b.likes||[]).length-(a.likes||[]).length||new Date(b.createdAt||0)-new Date(a.createdAt||0));

    const submitPost=()=>{
      if(!newPost.text.trim())return;
      const post={id:uid(),text:newPost.text,imageUrl:newPost.imageUrl||"",videoUrl:newPost.videoUrl||"",category:newPost.category,createdAt:new Date().toISOString(),likes:[],dislikes:[],reactions:{},comments:[]};
      upd(p=>({...p,posts:[post,...(p.posts||[])]}));
      setNewPost({text:"",imageUrl:"",videoUrl:"",category:""});
      setShowPostForm(false);
    };

    const EMOJI_REACTIONS=CUSTOM_EMOJIS.map(x=>x.e);

    const REACTIONS_KEY="up_reactions";
    const getReactions=()=>{try{return JSON.parse(localStorage.getItem(REACTIONS_KEY)||"{}");}catch{return {};}};
    const react=(postId,authorId,type)=>{
      const rx=getReactions();
      const key=`${postId}_${authUser.id}`;
      const prev=rx[key];
      if(prev===type){delete rx[key];}
      else{rx[key]=type;}
      localStorage.setItem(REACTIONS_KEY,JSON.stringify(rx));
      const updatePost=(post)=>{
        const newReacts={...post.reactions||{}};
        EMOJI_REACTIONS.concat(["like","dislike"]).forEach(e=>{
          if(newReacts[e]) newReacts[e]=(newReacts[e]||[]).filter(x=>x!==authUser.id);
        });
        if(rx[key]) newReacts[rx[key]]=[...(newReacts[rx[key]]||[]),authUser.id];
        return{...post,reactions:newReacts,likes:newReacts["like"]||[],dislikes:newReacts["dislike"]||[]};
      };
      if(authorId===authUser.id){
        upd(p=>({...p,posts:(p.posts||[]).map(post=>post.id===postId?updatePost(post):post)}));
      } else {
        const aData=loadData(authorId)||{};
        saveData(authorId,{...aData,posts:(aData.posts||[]).map(post=>post.id===postId?updatePost(post):post)});
      }
    };
    const getMyRx=(post)=>{const rx=getReactions();return rx[`${post.id}_${authUser.id}`]||null;};
    const getRxCount=(post,e)=>(post.reactions?.[e]||[]).length;
    const getTotalEngagement=(post)=>EMOJI_REACTIONS.concat(["like"]).reduce((a,e)=>a+(post.reactions?.[e]?.length||0),0)||(post.likes||[]).length;

    const sendFriendRequest=(targetEmail)=>{
      const target=allUsers[targetEmail.toLowerCase()];
      if(!target){alert("No user found with that email.");return;}
      if(target.id===authUser.id){alert("You can't add yourself!");return;}
      if(myFriends.includes(target.id)){alert("Already friends!");return;}
      const targetData=loadData(target.id)||{};
      const reqs=[...(targetData.friendRequests||[]).filter(r=>r.from!==authUser.id),{from:authUser.id,fromName:myName||authUser.name,fromEmail:authUser.email,sentAt:new Date().toISOString()}];
      saveData(target.id,{...targetData,friendRequests:reqs});
      setAddFriendEmail("");
      alert(`Friend request sent to ${target.name}!`);
    };

    const acceptRequest=(req)=>{
      upd(p=>({...p,friends:[...(p.friends||[]),req.from],friendRequests:(p.friendRequests||[]).filter(r=>r.from!==req.from)}));
      const theirData=loadData(req.from)||{};
      saveData(req.from,{...theirData,friends:[...(theirData.friends||[]),authUser.id]});
    };
    const declineRequest=(req)=>upd(p=>({...p,friendRequests:(p.friendRequests||[]).filter(r=>r.from!==req.from)}));

    const PostCard=({post})=>{
      const [showEmoji,setShowEmoji]=useState(false);
      const myRx=getMyRx(post);
      const totalEngage=getTotalEngagement(post);
      return(
        <div style={{...S.card,marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:post.authorAvatar?"transparent":post.authorAvatarColor,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",flexShrink:0,border:"2px solid rgba(255,255,255,0.1)"}}>
              {post.authorAvatar?<img src={post.authorAvatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:post.authorInitials}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{post.authorName}</span>
                {post.authorIsPro&&<span style={{background:"linear-gradient(135deg,#fbbf24,#d97706)",color:"#000",borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:800}}>★ PRO</span>}
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{new Date(post.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
            </div>
            {post.category&&<span style={{fontSize:10,background:"rgba(79,156,249,0.12)",color:"#4f9cf9",border:"1px solid rgba(79,156,249,0.25)",borderRadius:6,padding:"2px 8px"}}>{post.category}</span>}
            {totalEngage>=3&&<span style={{fontSize:10,background:"rgba(251,191,36,0.15)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.3)",borderRadius:6,padding:"2px 8px"}}>🔥 {totalEngage}</span>}
          </div>
          <p style={{fontSize:14,color:"rgba(255,255,255,0.85)",lineHeight:1.7,margin:"0 0 12px"}}>{post.text}</p>
          {post.imageUrl&&<div style={{borderRadius:12,overflow:"hidden",marginBottom:12}}><img src={post.imageUrl} alt="post" style={{width:"100%",maxHeight:320,objectFit:"cover"}} onError={e=>e.target.style.display="none"}/></div>}
          {post.videoUrl&&<div style={{borderRadius:12,overflow:"hidden",marginBottom:12,background:"#000"}}><video controls src={post.videoUrl} style={{width:"100%",maxHeight:320,borderRadius:12}} onError={e=>e.target.style.display="none"}/></div>}
          {/* Active emoji reaction summary */}
          {EMOJI_REACTIONS.filter(e=>getRxCount(post,e)>0).length>0&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
              {EMOJI_REACTIONS.filter(e=>getRxCount(post,e)>0).map(e=>(
                <span key={e} onClick={()=>react(post.id,post.authorId,e)} style={{fontSize:12,background:myRx===e?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${myRx===e?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.07)"}`,borderRadius:20,padding:"3px 9px",cursor:"pointer"}}>{e} {getRxCount(post,e)}</span>
              ))}
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)",flexWrap:"wrap",position:"relative"}}>
            <button onClick={()=>react(post.id,post.authorId,"like")} style={{background:myRx==="like"?"rgba(79,156,249,0.15)":"transparent",border:`1px solid ${myRx==="like"?"rgba(79,156,249,0.4)":"rgba(255,255,255,0.08)"}`,color:myRx==="like"?"#4f9cf9":"rgba(255,255,255,0.45)",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:13,fontFamily:"'DM Sans',sans-serif",borderRadius:8,padding:"5px 12px",transition:"all 0.2s"}}>
              👍 <span style={{fontWeight:600}}>{getRxCount(post,"like")||(post.likes||[]).length}</span>
            </button>
            <button onClick={()=>react(post.id,post.authorId,"dislike")} style={{background:myRx==="dislike"?"rgba(249,123,79,0.15)":"transparent",border:`1px solid ${myRx==="dislike"?"rgba(249,123,79,0.4)":"rgba(255,255,255,0.08)"}`,color:myRx==="dislike"?"#f97b4f":"rgba(255,255,255,0.45)",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:13,fontFamily:"'DM Sans',sans-serif",borderRadius:8,padding:"5px 12px",transition:"all 0.2s"}}>
              👎 <span style={{fontWeight:600}}>{getRxCount(post,"dislike")||(post.dislikes||[]).length}</span>
            </button>
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowEmoji(p=>!p)} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:myRx&&EMOJI_REACTIONS.includes(myRx)?myRx:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14,borderRadius:8,padding:"5px 12px",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:5}}>
                {myRx&&EMOJI_REACTIONS.includes(myRx)?<span>{myRx}</span>:<span style={{fontSize:13}}>😊</span>} <span style={{fontSize:12}}>React</span>
              </button>
              {showEmoji&&(
                <div style={{position:"absolute",bottom:"110%",left:0,background:"#1a1d26",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:10,display:"flex",flexWrap:"wrap",gap:5,zIndex:300,boxShadow:"0 8px 30px rgba(0,0,0,0.7)",minWidth:230}}>
                  {EMOJI_REACTIONS.map(e=>(
                    <button key={e} onClick={()=>{react(post.id,post.authorId,e);setShowEmoji(false);}} style={{fontSize:22,background:myRx===e?"rgba(255,255,255,0.15)":"transparent",border:`1px solid ${myRx===e?"rgba(255,255,255,0.25)":"transparent"}`,borderRadius:9,padding:"6px 8px",cursor:"pointer",transition:"all 0.15s",lineHeight:1}}>{e}</button>
                  ))}
                </div>
              )}
            </div>
            {post.isMine&&<button onClick={()=>upd(p=>({...p,posts:(p.posts||[]).filter(x=>x.id!==post.id)}))} style={{marginLeft:"auto",background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>Delete</button>}
          </div>
        </div>
      );
    };

    return(
      <div style={{maxWidth:680,margin:"0 auto"}}>
        {/* Sub-tabs */}
        <div style={{display:"flex",gap:4,marginBottom:20,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4}}>
          {[{id:"feed",label:"📰 Feed"},{id:"friends",label:`👥 Friends (${myFriends.length})`},{id:"requests",label:`🔔 Requests${myRequests.length>0?" ("+myRequests.length+")":""}`}].map(t=>(
            <button key={t.id} onClick={()=>setSocialTab(t.id)} style={{flex:1,padding:"9px 0",border:"none",cursor:"pointer",background:socialTab===t.id?"rgba(79,156,249,0.2)":"transparent",color:socialTab===t.id?"#4f9cf9":"rgba(255,255,255,0.4)",borderRadius:9,fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"}}>{t.label}</button>
          ))}
        </div>

        {/* FEED */}
        {socialTab==="feed"&&(
          <div>
            {/* New post button */}
            <div style={{...S.card,marginBottom:16,borderColor:"rgba(79,156,249,0.2)",background:"rgba(79,156,249,0.04)"}}>
              {!showPostForm?(
                <button onClick={()=>setShowPostForm(true)} style={{width:"100%",background:"transparent",border:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12,padding:0}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:prof.avatarUrl?"transparent":prof.avatarColor||"linear-gradient(135deg,#4f9cf9,#c084fc)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",flexShrink:0}}>
                    {prof.avatarUrl?<img src={prof.avatarUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:myInitials}
                  </div>
                  <span style={{fontSize:14,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Sans',sans-serif"}}>Share your progress, wins, or motivation…</span>
                </button>
              ):(
                <div>
                  <textarea value={newPost.text} onChange={e=>setNewPost(p=>({...p,text:e.target.value}))} placeholder="What did you accomplish? Share a win, progress update, or words of encouragement…" rows={3} style={{...S.inp,resize:"none",lineHeight:1.7,marginBottom:10}}/>
                  <input value={newPost.imageUrl} onChange={e=>setNewPost(p=>({...p,imageUrl:e.target.value}))} placeholder="Paste image URL (optional)" style={{...S.inp,fontSize:12,marginBottom:6}}/>
                  <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                    <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                      <div style={{background:"rgba(79,156,249,0.1)",border:"1px dashed rgba(79,156,249,0.35)",borderRadius:8,padding:"7px 14px",fontSize:12,color:"#4f9cf9",display:"flex",alignItems:"center",gap:5}}>📷 Photo</div>
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                        const file=e.target.files?.[0]; if(!file)return;
                        const reader=new FileReader();
                        reader.onload=ev=>setNewPost(p=>({...p,imageUrl:ev.target.result}));
                        reader.readAsDataURL(file);
                      }}/>
                      {newPost.imageUrl&&<span style={{fontSize:11,color:"#34c98a"}}>✓</span>}
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                      <div style={{background:"rgba(192,132,252,0.1)",border:"1px dashed rgba(192,132,252,0.35)",borderRadius:8,padding:"7px 14px",fontSize:12,color:"#c084fc",display:"flex",alignItems:"center",gap:5}}>🎥 Video</div>
                      <input type="file" accept="video/*" style={{display:"none"}} onChange={e=>{
                        const file=e.target.files?.[0]; if(!file)return;
                        if(file.size>50*1024*1024){alert("Video must be under 50MB for local storage.");return;}
                        const reader=new FileReader();
                        reader.onload=ev=>setNewPost(p=>({...p,videoUrl:ev.target.result}));
                        reader.readAsDataURL(file);
                      }}/>
                      {newPost.videoUrl&&<span style={{fontSize:11,color:"#34c98a"}}>✓</span>}
                    </label>
                    {(newPost.imageUrl||newPost.videoUrl)&&<button onClick={()=>setNewPost(p=>({...p,imageUrl:"",videoUrl:""}))} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>✕ Clear media</button>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8}}>
                    <select value={newPost.category} onChange={e=>setNewPost(p=>({...p,category:e.target.value}))} style={S.sel}>
                      <option value="">Category (optional)</option>
                      {CATS.map(c=><option key={c.id} value={c.label}>{c.icon} {c.label}</option>)}
                    </select>
                    <button onClick={submitPost} style={{...S.btn("#4f9cf9"),fontWeight:700}}>Post 🚀</button>
                    <button onClick={()=>{setShowPostForm(false);setNewPost({text:"",imageUrl:"",category:""}); }} style={{...S.btn("rgba(255,255,255,0.08)"),color:"rgba(255,255,255,0.5)"}}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            {allPosts.length===0?(
              <div style={{textAlign:"center",padding:"50px 20px",color:"rgba(255,255,255,0.2)"}}>
                <div style={{fontSize:40,marginBottom:12}}>👥</div>
                <div style={{fontSize:15,marginBottom:6}}>No posts yet</div>
                <div style={{fontSize:13}}>Be the first to share your progress!</div>
              </div>
            ):allPosts.map(post=><PostCard key={post.id} post={post}/>)}
          </div>
        )}

        {/* FRIENDS */}
        {socialTab==="friends"&&(
          <div>
            <div style={{...S.card,marginBottom:16}}>
              <p style={{...S.title,marginBottom:12}}>Add Friend by Email</p>
              <div style={{display:"flex",gap:8}}>
                <input value={addFriendEmail} onChange={e=>setAddFriendEmail(e.target.value)} placeholder="friend@example.com" style={{...S.inp,flex:1}} onKeyDown={e=>e.key==="Enter"&&sendFriendRequest(addFriendEmail)}/>
                <button onClick={()=>sendFriendRequest(addFriendEmail)} style={{...S.btn("#4f9cf9"),fontWeight:700}}>Send Request</button>
              </div>
            </div>
            {myFriends.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,0.2)"}}>
                <div style={{fontSize:36,marginBottom:10}}>🤝</div>
                <div>No friends yet. Search by email above!</div>
              </div>
            ):myFriends.map(fid=>{
              const fu=Object.values(allUsers).find(u=>u.id===fid);
              if(!fu)return null;
              const fData=loadData(fid)||{};
              const fProf=fData.profile||{};
              const fName=`${fProf.firstName||fu.name} ${fProf.lastName||""}`.trim()||fu.name;
              const fInitials=fName.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"?";
              return(
                <div key={fid} style={{...S.card,marginBottom:10,display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:fProf.avatarUrl?"transparent":fProf.avatarColor||"linear-gradient(135deg,#4f9cf9,#c084fc)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#fff",flexShrink:0}}>
                    {fProf.avatarUrl?<img src={fProf.avatarUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:fInitials}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>{fName}</span>
                      {fu.isPro&&<span style={{background:"linear-gradient(135deg,#fbbf24,#d97706)",color:"#000",borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:800}}>★ PRO</span>}
                    </div>
                    {(fProf.city||fProf.state)&&<div style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>📍 {[fProf.city,fProf.state].filter(Boolean).join(", ")}</div>}
                  </div>
                  <button onClick={()=>upd(p=>({...p,friends:(p.friends||[]).filter(x=>x!==fid)}))} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.3)",padding:"5px 10px",borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>Remove</button>
                </div>
              );
            })}
          </div>
        )}

        {/* FRIEND REQUESTS */}
        {socialTab==="requests"&&(
          <div>
            {myRequests.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,0.2)"}}>
                <div style={{fontSize:36,marginBottom:10}}>🔔</div>
                <div>No pending friend requests.</div>
              </div>
            ):myRequests.map(req=>(
              <div key={req.from} style={{...S.card,marginBottom:10,display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#4f9cf9,#c084fc)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#fff",flexShrink:0}}>
                  {(req.fromName||"?").charAt(0).toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{req.fromName||req.fromEmail}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>{req.fromEmail} · {new Date(req.sentAt).toLocaleDateString()}</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>acceptRequest(req)} style={{...S.btn("#34c98a"),padding:"7px 14px",fontSize:12,fontWeight:700}}>✓ Accept</button>
                  <button onClick={()=>declineRequest(req)} style={{...S.btn("rgba(255,255,255,0.08)"),padding:"7px 14px",fontSize:12,color:"rgba(255,255,255,0.4)"}}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRoutines=()=>{
    if(!isPro)return(
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <Lock onUpgrade={goPro} msg="Morning & Evening Routines are a Pro feature. Build powerful daily habits that set the tone for your whole day."/>
      </div>
    );
    const morning=data.routines?.morning||[];
    const evening=data.routines?.evening||[];
    const addRoutineItem=(type)=>{
      if(!routineItemDraft.title.trim())return;
      upd(p=>({...p,routines:{...p.routines,[type]:[...(p.routines?.[type]||[]),{...routineItemDraft,id:uid()}]}}));
      setRoutineItemDraft({time:type==="morning"?"6:00 AM":"8:00 PM",title:"",duration:10,notes:""});
      setRoutineEditType(null);
    };
    const delRoutineItem=(type,id)=>upd(p=>({...p,routines:{...p.routines,[type]:(p.routines?.[type]||[]).filter(x=>x.id!==id)}}));
    const toggleRoutineItem=(type,id)=>upd(p=>({...p,routines:{...p.routines,[type]:(p.routines?.[type]||[]).map(x=>x.id===id?{...x,done:!x.done}:x)}}));

    const MORNING_TIPS=[
      {icon:"💧",tip:"Drink 16oz of water immediately after waking — rehydrates your body after 8 hours of sleep."},
      {icon:"🚫📱",tip:"Don't check your phone for the first 30 minutes — this protects your mindset and focus."},
      {icon:"🧘",tip:"5 minutes of deep breathing or meditation dramatically lowers cortisol and sharpens focus."},
      {icon:"📓",tip:"Write down 3 things you're grateful for — it shifts your brain toward positivity for the whole day."},
      {icon:"🎯",tip:"Review your top 3 priorities for the day before any distractions hit."},
      {icon:"🚶",tip:"A short walk or light movement in the morning boosts energy and mood more than coffee alone."},
      {icon:"🌅",tip:"Expose yourself to natural light within 1 hour of waking — regulates your circadian rhythm."},
      {icon:"🥚",tip:"Eat a high-protein breakfast to sustain energy and prevent mid-morning crashes."},
    ];
    const EVENING_TIPS=[
      {icon:"📵",tip:"Stop all screens 60 minutes before bed — blue light suppresses melatonin production."},
      {icon:"📝",tip:"Brain-dump tomorrow's to-do list before sleep — clears mental clutter so you can rest."},
      {icon:"🌡️",tip:"Keep your bedroom cool (65-68°F) for deeper, more restorative sleep."},
      {icon:"📖",tip:"Read fiction for 20 minutes — it reduces stress by up to 68% and eases the mind."},
      {icon:"🙏",tip:"Reflect on 3 wins from your day, no matter how small — ends the day with a sense of progress."},
      {icon:"🛁",tip:"A warm shower or bath 90 minutes before bed accelerates the natural drop in body temperature that triggers sleep."},
      {icon:"🌑",tip:"Make your room as dark as possible — even small lights can disrupt sleep quality."},
      {icon:"⏰",tip:"Set a consistent bedtime alarm — your wake-up time is more important than when you fall asleep."},
    ];

    const RoutineSection=({type,items,tips,accentColor,icon,label,defaultTime})=>{
      const total=items.length;
      const done=items.filter(x=>x.done).length;
      const totalMin=items.reduce((a,x)=>a+(parseInt(x.duration)||0),0);
      const adding=routineEditType===type;
      return(
        <div style={{...S.card,marginBottom:28,borderLeft:`4px solid ${accentColor}`}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontFamily:"'Syne',serif",fontSize:20,fontWeight:800,color:"#fff"}}>{icon} {label} Routine</div>
              {total>0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:3}}>{done}/{total} done today · ~{totalMin} min total</div>}
            </div>
            <button onClick={()=>{setRoutineEditType(adding?null:type);setRoutineItemDraft({time:defaultTime,title:"",duration:10,notes:"",});}} style={{...S.btn(adding?"rgba(255,255,255,0.08)":accentColor,adding?"":"#000"),fontSize:13,padding:"8px 16px"}}>
              {adding?"Cancel":"+ Add Step"}
            </button>
          </div>

          {/* Progress bar */}
          {total>0&&<div style={{marginBottom:16}}><Bar pct={Math.round(done/total*100)} color={accentColor} h={5}/></div>}

          {/* Add form */}
          {adding&&(
            <div style={{background:`${accentColor}0d`,borderRadius:12,padding:"14px 16px",marginBottom:16,border:`1px solid ${accentColor}30`}}>
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr 80px",gap:8,marginBottom:8,alignItems:"end"}}>
                <div>
                  <label style={{...S.lbl,color:accentColor}}>Time</label>
                  <TimeInput value={routineItemDraft.time} onChange={v=>setRoutineItemDraft(p=>({...p,time:v}))}/>
                </div>
                <div>
                  <label style={{...S.lbl,color:accentColor}}>Activity</label>
                  <input placeholder={`e.g. ${type==="morning"?"Drink water, Meditate":"Journal, Read"}`} value={routineItemDraft.title} onChange={e=>setRoutineItemDraft(p=>({...p,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addRoutineItem(type)} style={S.inp}/>
                </div>
                <div>
                  <label style={{...S.lbl,color:accentColor}}>Min</label>
                  <input type="number" min="1" max="120" placeholder="10" value={routineItemDraft.duration} onChange={e=>setRoutineItemDraft(p=>({...p,duration:parseInt(e.target.value)||10}))} style={S.inp}/>
                </div>
              </div>
              <div style={{marginBottom:10}}>
                <label style={{...S.lbl,color:accentColor}}>Notes (optional)</label>
                <input placeholder="Any details about this step…" value={routineItemDraft.notes} onChange={e=>setRoutineItemDraft(p=>({...p,notes:e.target.value}))} style={S.inp}/>
              </div>
              <button onClick={()=>addRoutineItem(type)} style={{...S.btn(accentColor,"#000"),fontWeight:700}}>Add to Routine</button>
            </div>
          )}

          {/* Routine items */}
          {items.length===0&&!adding&&(
            <div style={{textAlign:"center",padding:"24px 0",color:"rgba(255,255,255,0.2)",fontSize:13,fontStyle:"italic"}}>
              No steps yet. Click "+ Add Step" to build your {label.toLowerCase()} routine.
            </div>
          )}
          <div style={{marginBottom:16}}>
            {items.map((item,i)=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,marginBottom:6,background:item.done?`${accentColor}10`:"rgba(255,255,255,0.03)",border:`1px solid ${item.done?accentColor+"30":"rgba(255,255,255,0.07)"}`,transition:"all 0.2s"}}>
                <div onClick={()=>toggleRoutineItem(type,item.id)} style={{width:18,height:18,borderRadius:5,border:`2px solid ${item.done?accentColor:"rgba(255,255,255,0.2)"}`,background:item.done?accentColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                  {item.done&&<span style={{color:"#000",fontSize:10,fontWeight:900}}>✓</span>}
                </div>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.35)",minWidth:55}}>{item.time}</span>
                <span style={{flex:1,fontSize:13,color:item.done?"rgba(255,255,255,0.35)":"#f0ece4",textDecoration:item.done?"line-through":"none"}}>{item.title}</span>
                {item.duration>0&&<span style={{fontSize:11,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.05)",borderRadius:5,padding:"2px 7px"}}>{item.duration}m</span>}
                {item.notes&&<span style={{fontSize:10,color:"rgba(255,255,255,0.25)",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={item.notes}>{item.notes}</span>}
                <button onClick={()=>delRoutineItem(type,item.id)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.15)",cursor:"pointer",fontSize:15,padding:"0 4px"}}>×</button>
              </div>
            ))}
          </div>

          {/* Tips section */}
          <div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,padding:"14px 16px",border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontSize:10,color:accentColor,letterSpacing:"2px",textTransform:"uppercase",fontWeight:700,marginBottom:12}}>💡 {label} Tips</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8}}>
              {tips.map((t,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 12px"}}>
                  <span style={{fontSize:18,flexShrink:0,lineHeight:1.2}}>{t.icon}</span>
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.6}}>{t.tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    return(
      <div style={{maxWidth:720,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div>
            <h2 style={{...S.title,fontSize:22,margin:0}}>Morning & Evening Routines</h2>
            <p style={{margin:"4px 0 0",color:"rgba(255,255,255,0.35)",fontSize:13}}>Design powerful daily rituals to own your mornings and wind down well.</p>
          </div>
        </div>
        <RoutineSection type="morning" items={morning} tips={MORNING_TIPS} accentColor="#fbbf24" icon="☀️" label="Morning" defaultTime="6:00 AM"/>
        <RoutineSection type="evening" items={evening} tips={EVENING_TIPS} accentColor="#c084fc" icon="🌙" label="Evening" defaultTime="8:00 PM"/>
      </div>
    );
  };

  const renderUpgrade=()=>{
    const PRO_FEATURES=[
      {icon:"🤖",label:"AI Planning Coach",desc:"Personal Claude AI coach that knows your goals"},
      {icon:"📊",label:"Advanced Analytics",desc:"Line graphs, KI trends, financial progress"},
      {icon:"🗓️",label:"Google Calendar Sync",desc:"Real-time sync of tasks, goals & deadlines"},
      {icon:"💡",label:"Inspiration Library",desc:"Save & organize quotes, scriptures, speeches"},
      {icon:"☀️",label:"Daily Motivation Notifications",desc:"Morning inspiration from your own library"},
      {icon:"🚫",label:"No Ads — Ever",desc:"Completely ad-free experience forever"},
      {icon:"♾️",label:"Unlimited Everything",desc:"KIs, goals, tasks, financial goals — no limits"},
      {icon:"☁️",label:"Cloud Backup",desc:"Your data synced and safe across all devices"},
      {icon:"📱",label:"All Platforms",desc:"iOS, Android, Mac, Windows, Web"},
    ];
    const FREE_FEATURES=[
      {icon:"📊",label:"4 Key Indicators"},
      {icon:"🎯",label:"2 Life Goals"},
      {icon:"📋",label:"14 Tasks/Week"},
      {icon:"💰",label:"1 Financial Goal"},
      {icon:"🏅",label:"All 140+ Achievements"},
      {icon:"🪞",label:"Weekly Reflection"},
      {icon:"📅",label:"Weekly Planner"},
    ];
    return(
      <div style={{maxWidth:760,margin:"0 auto"}}>
        {/* Hero */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:70,height:70,borderRadius:22,background:"linear-gradient(135deg,#fbbf24,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px",boxShadow:"0 0 40px rgba(251,191,36,0.4)"}}>★</div>
          <div style={{fontSize:11,color:"#fbbf24",letterSpacing:"4px",textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Ultimate Planner Pro</div>
          <div style={{fontFamily:"'Syne',serif",fontSize:34,fontWeight:800,color:"#fff",lineHeight:1.2,marginBottom:10}}>Your Best Life Deserves<br/>The Best Tools</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.45)",maxWidth:440,margin:"0 auto"}}>Unlock AI coaching, unlimited goals, no ads, and the complete suite of planning tools.</div>
          {isPro&&(
            <div style={{marginTop:20,display:"inline-flex",alignItems:"center",gap:10,background:"rgba(52,201,138,0.12)",border:"1px solid rgba(52,201,138,0.3)",borderRadius:12,padding:"12px 24px",color:"#34c98a",fontWeight:700,fontSize:15}}>
              ✓ You're on Pro — everything unlocked! Enjoy your ad-free experience.
            </div>
          )}
        </div>

        {!isPro&&(
          <>
            {/* Pricing plans */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:22}}>
              {PLANS.map(p=>(
                <div key={p.id} onClick={handleUpgrade} style={{borderRadius:18,padding:"22px 18px",border:`2px solid ${p.popular?"rgba(251,191,36,0.6)":"rgba(255,255,255,0.1)"}`,background:p.popular?"rgba(251,191,36,0.07)":"rgba(255,255,255,0.03)",position:"relative",cursor:"pointer",transition:"transform 0.2s",textAlign:"center"}}>
                  {p.popular&&<div style={{position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#fbbf24,#d97706)",color:"#000",fontSize:10,fontWeight:800,padding:"3px 14px",borderRadius:20,whiteSpace:"nowrap"}}>MOST POPULAR</div>}
                  {p.save&&<div style={{fontSize:11,color:"#34c98a",fontWeight:700,marginBottom:6}}>{p.save}</div>}
                  <div style={{fontFamily:"'Syne',serif",fontSize:30,fontWeight:800,color:"#fff"}}>{p.price}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:6}}>{p.period}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.7)"}}>{p.label}</div>
                  {p.id==="lifetime"&&<div style={{fontSize:10,color:"#fbbf24",marginTop:4}}>One payment, forever</div>}
                </div>
              ))}
            </div>
            <button onClick={handleUpgrade} style={{width:"100%",background:"linear-gradient(135deg,#fbbf24,#d97706)",border:"none",color:"#000",padding:"18px 0",borderRadius:14,cursor:"pointer",fontSize:17,fontWeight:800,boxShadow:"0 6px 30px rgba(251,191,36,0.45)",marginBottom:10,fontFamily:"'Syne',serif",letterSpacing:"-0.3px"}}>
              Start 7-Day Free Trial →
            </button>
            <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.25)",marginBottom:30}}>
              7-day free trial · Cancel anytime · Secure payments via RevenueCat &amp; Stripe · No surprise charges
            </div>

            {/* Pro features */}
            <div style={{...S.card,marginBottom:20,borderColor:"rgba(251,191,36,0.2)",background:"rgba(251,191,36,0.03)"}}>
              <p style={{...S.title,color:"#fbbf24",fontSize:18,marginBottom:18}}>✨ Everything in Pro</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {PRO_FEATURES.map(f=>(
                  <div key={f.label} style={{display:"flex",alignItems:"flex-start",gap:12,background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"13px 14px",border:"1px solid rgba(255,255,255,0.07)"}}>
                    <span style={{fontSize:22,flexShrink:0}}>{f.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:2}}>{f.label}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",lineHeight:1.4}}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Free vs Pro comparison */}
            <div style={S.card}>
              <p style={{...S.title,fontSize:16,marginBottom:16}}>Free vs Pro at a Glance</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"16px 18px",border:"1px solid rgba(255,255,255,0.08)"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.6)",marginBottom:12,letterSpacing:"1px",textTransform:"uppercase"}}>Free</div>
                  {FREE_FEATURES.map(f=>(
                    <div key={f.label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13,color:"rgba(255,255,255,0.55)"}}>
                      <span style={{fontSize:16}}>{f.icon}</span>{f.label}
                    </div>
                  ))}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13,color:"rgba(249,123,79,0.7)"}}>
                    <span>📢</span>Contains ads
                  </div>
                </div>
                <div style={{background:"rgba(251,191,36,0.06)",borderRadius:12,padding:"16px 18px",border:"1px solid rgba(251,191,36,0.2)"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:12,letterSpacing:"1px",textTransform:"uppercase"}}>★ Pro</div>
                  {FREE_FEATURES.map(f=>(
                    <div key={f.label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13,color:"rgba(255,255,255,0.8)"}}>
                      <span style={{color:"#34c98a",fontWeight:700}}>✓</span> Unlimited {f.label.replace(/^\d+ /,"").replace("/Week","")}
                    </div>
                  ))}
                  {PRO_FEATURES.map(f=>(
                    <div key={f.label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13,color:"rgba(255,255,255,0.8)"}}>
                      <span style={{color:"#34c98a",fontWeight:700}}>✓</span>{f.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const tabContent={dashboard:renderDashboard,indicators:renderIndicators,yearly:renderYearly,financial:renderFinancial,weekly:renderWeekly,reflection:renderReflection,achievements:renderAchievements,social:renderSocial,profile:renderProfile,routines:renderRoutines,aichat:renderAIChat,analytics:renderAnalytics,inspiration:renderInspiration,upgrade:renderUpgrade};

  return(
    <div style={{minHeight:"100vh",background:"#08090d",fontFamily:"'DM Sans','Helvetica Neue',sans-serif",color:"#f0ece4",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:rgba(255,255,255,0.03)}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
        input:focus,textarea:focus,select:focus{border-color:rgba(79,156,249,0.5)!important;box-shadow:0 0 0 3px rgba(79,156,249,0.1)!important}
        button:hover{opacity:0.85!important}
        input[type=range]{cursor:pointer}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>

      {/* Header */}
      <header style={{background:"rgba(8,9,13,0.96)",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:60,position:"sticky",top:0,zIndex:200,backdropFilter:"blur(14px)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#4f9cf9,#fbbf24)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 0 18px rgba(79,156,249,0.3)"}}>◈</div>
          <div>
            <div style={{fontFamily:"'Syne',serif",fontSize:15,fontWeight:800,color:"#fff",letterSpacing:"-0.3px"}}>{APP_NAME}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:"2px",textTransform:"uppercase"}}>{APP_TAGLINE}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <Ring pct={overallPct()} size={42} stroke={4} color="#4f9cf9"/>
          <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>setTab("achievements")}>
            <span style={{fontSize:18}}>🏅</span>
            <span style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>{earned.length}</span>
          </div>
          {isPro
            ?<span style={{display:"inline-flex",alignItems:"center",gap:4,background:"linear-gradient(135deg,#fbbf24,#d97706)",color:"#000",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:800}}>★ PRO</span>
            :<button onClick={goPro} style={{background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.3)",color:"#fbbf24",padding:"4px 12px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>Upgrade ★</button>
          }
          <div onClick={()=>setTab("profile")} style={{width:32,height:32,borderRadius:"50%",background:data?.profile?.avatarUrl?"transparent":data?.profile?.avatarColor||"linear-gradient(135deg,#4f9cf9,#c084fc)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,cursor:"pointer",border:"2px solid rgba(255,255,255,0.15)",position:"relative"}}>
            {data?.profile?.avatarUrl?<img src={data.profile.avatarUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/>:<span style={{fontWeight:700,color:"#fff"}}>{authUser.name.charAt(0).toUpperCase()}</span>}
          </div>
          <button onClick={handleLogout} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",padding:"5px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>Sign Out</button>
        </div>
      </header>

      {/* Nav */}
      <nav style={{display:"flex",gap:2,padding:"0 12px",borderBottom:"1px solid rgba(255,255,255,0.07)",background:"rgba(8,9,13,0.92)",overflowX:"auto",flexShrink:0,alignItems:"center"}}>
        {TABS.map((t,idx)=>(
          <div key={t.id}
            draggable={customizingNav}
            onDragStart={()=>setDragTabIdx(idx)}
            onDragOver={e=>{e.preventDefault();}}
            onDrop={()=>{ if(dragTabIdx!==null&&dragTabIdx!==idx){moveTab(dragTabIdx,idx);setDragTabIdx(null);} }}
            onDragEnd={()=>setDragTabIdx(null)}
            style={{position:"relative",opacity:dragTabIdx===idx?0.4:1,transition:"opacity 0.15s"}}>
            <button onClick={()=>{ if(!customizingNav) setTab(t.id); }} style={{
              padding:"13px 11px",border:"none",cursor:customizingNav?"grab":"pointer",background:"transparent",
              fontFamily:"'DM Sans',sans-serif",fontSize:12,
              color:t.highlight?"#fbbf24":tab===t.id&&!customizingNav?"#fff":"rgba(255,255,255,0.38)",
              borderBottom:tab===t.id&&!customizingNav?"2px solid #4f9cf9":"2px solid transparent",
              whiteSpace:"nowrap",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5,fontWeight:tab===t.id&&!customizingNav?600:400,
              ...(customizingNav?{background:"rgba(255,255,255,0.04)",borderRadius:8,border:"1px dashed rgba(255,255,255,0.15)",margin:"4px 2px"}:{})
            }}>
              {customizingNav&&<span style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginRight:2}}>⠿</span>}
              <span style={{fontSize:12}}>{t.icon}</span>{t.label}
              {t.pro&&!isPro&&<span style={{fontSize:9,color:"#fbbf24",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:4,padding:"1px 5px",fontWeight:700}}>PRO</span>}
            </button>
          </div>
        ))}
        {/* Customize button */}
        <div style={{marginLeft:"auto",paddingLeft:8,flexShrink:0,display:"flex",gap:6,alignItems:"center"}}>
          {customizingNav&&<span style={{fontSize:11,color:"rgba(79,156,249,0.7)"}}>Drag to reorder</span>}
          {customizingNav&&<button onClick={()=>{setCustomizingNav(false);setDragTabIdx(null);}} style={{background:"linear-gradient(135deg,#34c98a,#2da876)",border:"none",color:"#fff",padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>✓ Done</button>}
          {customizingNav&&<button onClick={()=>{saveTabOrder(DEFAULT_TABS.map(t=>t.id));}} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",padding:"5px 10px",borderRadius:7,cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>Reset</button>}
          {!customizingNav&&<button onClick={()=>setCustomizingNav(true)} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.35)",padding:"5px 10px",borderRadius:7,cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>⠿ Customize</button>}
        </div>
      </nav>

      {/* Nav Customization Modal */}
      {customizingNav&&(
        <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>{if(e.target===e.currentTarget){setCustomizingNav(false);setDragTabIdx(null);}}}>
          <div style={{background:"#0f1117",borderRadius:20,border:"1px solid rgba(255,255,255,0.1)",padding:28,maxWidth:560,width:"100%",maxHeight:"80vh",overflow:"auto",boxShadow:"0 0 60px rgba(79,156,249,0.15)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontFamily:"'Syne',serif",fontSize:18,fontWeight:800,color:"#fff"}}>⠿ Customize Navigation</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:3}}>Drag and drop to reorder your tabs.</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{saveTabOrder(DEFAULT_TABS.map(t=>t.id));}} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>↺ Reset</button>
                <button onClick={()=>{setCustomizingNav(false);setDragTabIdx(null);}} style={{background:"linear-gradient(135deg,#34c98a,#2da876)",border:"none",color:"#fff",padding:"6px 16px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>✓ Save</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {TABS.map((t,idx)=>(
                <div key={t.id}
                  draggable
                  onDragStart={()=>setDragTabIdx(idx)}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={()=>{ if(dragTabIdx!==null&&dragTabIdx!==idx){moveTab(dragTabIdx,idx);setDragTabIdx(null);} }}
                  onDragEnd={()=>setDragTabIdx(null)}
                  style={{display:"flex",alignItems:"center",gap:10,background:dragTabIdx===idx?"rgba(79,156,249,0.12)":"rgba(255,255,255,0.04)",borderRadius:10,padding:"11px 14px",border:`1px solid ${dragTabIdx===idx?"rgba(79,156,249,0.4)":"rgba(255,255,255,0.07)"}`,cursor:"grab",opacity:dragTabIdx===idx?0.5:1,transition:"all 0.15s",userSelect:"none"}}>
                  <span style={{fontSize:16,color:"rgba(255,255,255,0.2)",flexShrink:0}}>⠿</span>
                  <span style={{fontSize:16,flexShrink:0}}>{t.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:t.highlight?"#fbbf24":"#fff"}}>{t.label}</div>
                    {t.pro&&<div style={{fontSize:9,color:"#fbbf24",fontWeight:700}}>PRO FEATURE</div>}
                  </div>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>#{idx+1}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:16,padding:"12px 14px",background:"rgba(79,156,249,0.06)",borderRadius:10,border:"1px solid rgba(79,156,249,0.15)",fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.6}}>
              💡 Tip: Drag any tab card to change its position in the navigation bar. Changes save instantly.
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main style={{padding:"24px",maxWidth:1120,margin:"0 auto",width:"100%",flex:1,opacity:animIn?1:0,transform:animIn?"translateY(0)":"translateY(14px)",transition:"all 0.5s cubic-bezier(.16,1,.3,1) 0.2s"}}>
        {/* Ad banner for free users */}
        {!isPro&&(
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:80,height:28,background:"rgba(255,255,255,0.06)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"rgba(255,255,255,0.25)",letterSpacing:"1px",flexShrink:0}}>AD SPACE</div>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.25)"}}>Free users see ads here — upgrade to remove them forever.</span>
            </div>
            <button onClick={goPro} style={{background:"linear-gradient(135deg,#fbbf24,#d97706)",border:"none",color:"#000",padding:"5px 14px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>Remove Ads ★</button>
          </div>
        )}
        {tabContent[tab]?.()}
      </main>

      {showUpgrade&&<UpgradeModal onClose={()=>setShowUpgrade(false)} onUpgrade={handleUpgrade}/>}
      {renderSundayPopup()}
      {renderPlanningWizard()}
      {renderDailyPlannerWizard()}
      {renderMorningInspo()}

      {/* Toast stack */}
      <div style={{position:"fixed",bottom:28,right:28,zIndex:950,display:"flex",flexDirection:"column",gap:10}}>
        {toasts.map(t=>(
          <Toast key={t.id} msg={t} onDone={()=>setToasts(p=>p.filter(x=>x.id!==t.id))}/>
        ))}
      </div>
    </div>
  );
}
