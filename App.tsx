
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Habit, Task, Category, AppState } from './types';
import { CATEGORIES, CATEGORY_COLORS } from './constants';
import HabitCard from './components/HabitCard';
import TaskItem from './components/TaskItem';
import { getAIProductivityAdvice } from './services/geminiService';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';

const App: React.FC = () => {
  // State Initialization
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState<string>('Alex');
  const [aiAdvice, setAiAdvice] = useState<string>("Loading your personal coaching tips...");
  const [activeTab, setActiveTab] = useState<'dashboard' | 'habits' | 'tasks' | 'reports'>('dashboard');
  
  // UI states
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCat, setNewHabitCat] = useState<Category>('Personal');
  
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCat, setNewTaskCat] = useState<Category>('Work');

  // Name Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const todayStr = new Date().toISOString().split('T')[0];

  // Persist State
  useEffect(() => {
    const saved = localStorage.getItem('zenhabit_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      setHabits(parsed.habits || []);
      setTasks(parsed.tasks || []);
      setUserName(parsed.userName || 'Alex');
      setTempName(parsed.userName || 'Alex');
    } else {
        // Initial Mock
        setHabits([
            { id: '1', name: 'Morning Meditation', category: 'Health', color: 'bg-emerald-500', logs: { [todayStr]: true }, streak: 1, createdAt: Date.now() },
            { id: '2', name: 'Coding Session', category: 'Work', color: 'bg-blue-500', logs: {}, streak: 0, createdAt: Date.now() }
        ]);
        setTasks([
            { id: '101', text: 'Launch habit tracker', completed: false, category: 'Work', date: todayStr }
        ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('zenhabit_data', JSON.stringify({ habits, tasks, userName }));
  }, [habits, tasks, userName]);

  // AI Advice
  const refreshAI = useCallback(async () => {
    setAiAdvice("Thinking...");
    const advice = await getAIProductivityAdvice(habits, tasks);
    setAiAdvice(advice);
  }, [habits, tasks]);

  useEffect(() => {
    refreshAI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleSaveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const toggleHabit = (id: string, date: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const newLogs = { ...h.logs, [date]: !h.logs[date] };
      
      // Basic streak calc (sequential days leading back from today)
      let streak = 0;
      let curr = new Date();
      while (true) {
        const dStr = curr.toISOString().split('T')[0];
        if (newLogs[dStr]) {
            streak++;
            curr.setDate(curr.getDate() - 1);
        } else {
            break;
        }
      }

      return { ...h, logs: newLogs, streak };
    }));
  };

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const habit: Habit = {
      id: Date.now().toString(),
      name: newHabitName,
      category: newHabitCat,
      color: CATEGORY_COLORS[newHabitCat],
      logs: {},
      streak: 0,
      createdAt: Date.now()
    };
    setHabits([...habits, habit]);
    setNewHabitName('');
    setShowAddHabit(false);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      completed: false,
      category: newTaskCat,
      date: todayStr
    };
    setTasks([task, ...tasks]);
    setNewTaskText('');
  };

  const deleteTask = (id: string) => setTasks(tasks.filter(t => t.id !== id));
  const toggleTask = (id: string) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteHabit = (id: string) => setHabits(habits.filter(h => h.id !== id));

  // Analytics
  const completionStats = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const habitsDone = habits.filter(h => h.logs[date]).length;
      const tasksDone = tasks.filter(t => t.date === date && t.completed).length;
      return {
        name: date.slice(5), // MM-DD
        score: habitsDone + tasksDone
      };
    });
  }, [habits, tasks]);

  const categoryDistribution = useMemo(() => {
    return CATEGORIES.map(cat => ({
      name: cat,
      value: tasks.filter(t => t.category === cat).length + habits.filter(h => h.category === cat).length
    })).filter(item => item.value > 0);
  }, [habits, tasks]);

  const COLORS = ['#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6'];

  const exportCSV = () => {
    let csv = "Type,Name,Category,Date,Status\n";
    habits.forEach(h => {
        Object.entries(h.logs).forEach(([date, val]) => {
            if (val) csv += `Habit,${h.name},${h.category},${date},Completed\n`;
        });
    });
    tasks.forEach(t => {
        csv += `Task,${t.text},${t.category},${t.date},${t.completed ? 'Completed' : 'Pending'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenhabit_report_${todayStr}.csv`;
    a.click();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="w-20 md:w-64 glass-morphism h-full flex flex-col border-r border-slate-200 z-10">
        <div className="p-6 flex items-center justify-center md:justify-start gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <i className="fas fa-leaf text-lg"></i>
          </div>
          <h1 className="hidden md:block font-extrabold text-xl text-slate-800 tracking-tight">ZenHabit</h1>
        </div>

        <nav className="flex-1 px-4 space-y-4 mt-8">
          {[
            { id: 'dashboard', icon: 'fa-th-large', label: 'Dashboard' },
            { id: 'habits', icon: 'fa-repeat', label: 'Habits' },
            { id: 'tasks', icon: 'fa-list-check', label: 'To-Do List' },
            { id: 'reports', icon: 'fa-chart-pie', label: 'Analytics' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-center md:justify-start gap-4 p-3.5 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                  : 'text-slate-400 hover:bg-white hover:text-slate-600'
              }`}
            >
              <i className={`fas ${item.icon} text-lg`}></i>
              <span className="hidden md:block font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="hidden md:block p-4 bg-indigo-50 rounded-2xl">
            <p className="text-xs font-bold text-indigo-400 uppercase mb-2">Power Tip</p>
            <p className="text-xs text-indigo-700 leading-relaxed">Try to maintain a 3-day streak to form a neural pathway.</p>
          </div>
          <button 
            onClick={exportCSV}
            className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-500 transition-all text-sm font-medium"
          >
            <i className="fas fa-file-excel"></i>
            <span className="hidden md:inline">Export Excel/CSV</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-transparent pb-20 md:pb-0">
        <header className="sticky top-0 p-6 md:px-10 flex justify-between items-center z-20 glass-morphism border-b border-white/20">
          <div className="flex flex-col">
            {isEditingName ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-left-4 duration-300">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-white/80 border border-indigo-200 rounded-xl px-3 py-1.5 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                />
                <button onClick={handleSaveName} className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-colors">
                  <i className="fas fa-check text-xs"></i>
                </button>
                <button onClick={() => setIsEditingName(false)} className="w-8 h-8 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors">
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
                  Hello, {userName} 👋
                </h2>
                <button 
                  onClick={() => { setTempName(userName); setIsEditingName(true); }}
                  className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Change Name"
                >
                  <i className="fas fa-pencil-alt text-sm"></i>
                </button>
              </div>
            )}
            <p className="text-slate-500 font-medium">It's a beautiful day for progress.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 font-bold hover:shadow-md transition-all">
                <i className="fas fa-calendar-day text-indigo-500"></i>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </button>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-tr from-rose-400 to-indigo-500 p-0.5 shadow-lg">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
          
          {/* AI Banner */}
          <section className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10">
                <i className="fas fa-robot text-9xl"></i>
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
                <i className="fas fa-wand-magic-sparkles text-2xl text-indigo-100 animate-pulse"></i>
              </div>
              <div className="text-center md:text-left">
                <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest mb-1">AI Coach Insights</p>
                <p className="text-lg md:text-xl font-medium leading-relaxed italic">"{aiAdvice}"</p>
              </div>
              <button 
                onClick={refreshAI}
                className="ml-auto px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white font-bold transition-all border border-white/10 flex items-center gap-2 text-sm"
              >
                <i className="fas fa-sync"></i> Refresh Advice
              </button>
            </div>
          </section>

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Habits Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Habits Progress</h3>
                    <p className="text-slate-400 text-sm">Consistency builds strength.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('habits')}
                    className="text-indigo-600 font-bold hover:underline text-sm"
                  >
                    View All
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {habits.slice(0, 4).map(habit => (
                    <HabitCard 
                      key={habit.id} 
                      habit={habit} 
                      onToggle={(d) => toggleHabit(habit.id, d)} 
                      onDelete={() => deleteHabit(habit.id)}
                    />
                  ))}
                  <button 
                    onClick={() => {setActiveTab('habits'); setShowAddHabit(true);}}
                    className="h-48 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all"
                  >
                    <i className="fas fa-plus-circle text-2xl"></i>
                    <span className="font-bold">Add New Habit</span>
                  </button>
                </div>
              </div>

              {/* Tasks Column */}
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <h3 className="text-xl font-bold text-slate-800">Today's Focus</h3>
                  <button onClick={() => setActiveTab('tasks')} className="text-indigo-600 font-bold hover:underline text-sm">Manage</button>
                </div>
                <div className="glass-morphism rounded-3xl p-6 shadow-sm min-h-[400px]">
                  <form onSubmit={addTask} className="mb-6 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add a task..." 
                      className="flex-1 bg-white/50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={newTaskText}
                      onChange={e => setNewTaskText(e.target.value)}
                    />
                    <button type="submit" className="w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center hover:scale-105 transition-transform">
                      <i className="fas fa-plus"></i>
                    </button>
                  </form>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {tasks.filter(t => t.date === todayStr).length === 0 ? (
                        <div className="text-center py-20 text-slate-400 italic">No tasks for today. Chill out or add one!</div>
                    ) : (
                        tasks.filter(t => t.date === todayStr).map(task => (
                            <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'habits' && (
             <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800">Your Habit Journey</h3>
                        <p className="text-slate-500">Don't break the chain.</p>
                    </div>
                    <button 
                        onClick={() => setShowAddHabit(true)}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 flex items-center gap-2 hover:scale-105 transition-all"
                    >
                        <i className="fas fa-plus"></i> Start New Habit
                    </button>
                </div>

                {showAddHabit && (
                    <div className="glass-morphism p-6 rounded-3xl border-2 border-indigo-200 shadow-xl animate-in fade-in zoom-in duration-300">
                        <h4 className="font-bold text-slate-700 mb-4">Set Up Your Habit</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input 
                                type="text" 
                                placeholder="Habit Name (e.g., Run 5km)" 
                                className="col-span-1 md:col-span-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newHabitName}
                                onChange={e => setNewHabitName(e.target.value)}
                            />
                            <select 
                                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newHabitCat}
                                onChange={e => setNewHabitCat(e.target.value as Category)}
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <button 
                                    onClick={addHabit}
                                    className="flex-1 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                                >
                                    Create
                                </button>
                                <button 
                                    onClick={() => setShowAddHabit(false)}
                                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {habits.map(habit => (
                        <HabitCard 
                          key={habit.id} 
                          habit={habit} 
                          onToggle={(d) => toggleHabit(habit.id, d)} 
                          onDelete={() => deleteHabit(habit.id)}
                        />
                    ))}
                </div>
             </div>
          )}

          {activeTab === 'tasks' && (
            <div className="max-w-2xl mx-auto space-y-6">
                <h3 className="text-2xl font-bold text-slate-800">To-Do Masterlist</h3>
                <div className="glass-morphism rounded-3xl p-8 shadow-sm">
                    <form onSubmit={addTask} className="space-y-4 mb-8">
                        <input 
                            type="text" 
                            placeholder="What needs to be done?" 
                            className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            value={newTaskText}
                            onChange={e => setNewTaskText(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setNewTaskCat(cat)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        newTaskCat === cat ? 'bg-indigo-600 text-white scale-105 shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                            <button type="submit" className="ml-auto px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 shadow-md">
                                <i className="fas fa-plus mr-2"></i> Add Task
                            </button>
                        </div>
                    </form>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-sm uppercase mb-4">
                            <i className="fas fa-clock"></i> Pending Tasks
                        </div>
                        {tasks.filter(t => !t.completed).map(task => (
                            <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />
                        ))}

                        <div className="flex items-center gap-2 text-slate-400 font-bold text-sm uppercase mt-8 mb-4">
                            <i className="fas fa-circle-check"></i> Completed
                        </div>
                        {tasks.filter(t => t.completed).map(task => (
                            <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />
                        ))}
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800">Activity Reports</h3>
                        <p className="text-slate-500">Visualizing your path to success.</p>
                    </div>
                    <button onClick={exportCSV} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center gap-2">
                        <i className="fas fa-file-csv"></i> Download CSV
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Activity Flow */}
                    <div className="glass-morphism p-8 rounded-[40px] shadow-sm">
                        <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-500 flex items-center justify-center"><i className="fas fa-chart-line text-xs"></i></span>
                            Performance Flow (Last 7 Days)
                        </h4>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={completionStats}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                                    />
                                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="glass-morphism p-8 rounded-[40px] shadow-sm">
                        <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-500 flex items-center justify-center"><i className="fas fa-chart-pie text-xs"></i></span>
                            Life Balance Distribution
                        </h4>
                        <div className="h-64 w-full flex items-center justify-center">
                            {categoryDistribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categoryDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-slate-400 italic">Start tracking to see distribution</div>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-2">
                             {categoryDistribution.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                                    <span className="text-xs font-bold text-slate-500">{entry.name}</span>
                                </div>
                             ))}
                        </div>
                    </div>
                </div>

                {/* Habit Specific Stats Table */}
                <div className="glass-morphism rounded-[40px] overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-white/40">
                        <h4 className="font-bold text-slate-700">Habit Leaderboard</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                                <tr>
                                    <th className="px-8 py-4">Habit</th>
                                    <th className="px-8 py-4">Category</th>
                                    <th className="px-8 py-4">Current Streak</th>
                                    <th className="px-8 py-4">Total Done</th>
                                    <th className="px-8 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {habits.map(h => (
                                    <tr key={h.id} className="hover:bg-white/50 transition-colors">
                                        <td className="px-8 py-6 font-bold text-slate-700">{h.name}</td>
                                        <td className="px-8 py-6">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${CATEGORY_COLORS[h.category]} text-white`}>
                                                {h.category}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-amber-500 font-extrabold flex items-center gap-1">
                                                <i className="fas fa-fire"></i> {h.streak} days
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 font-medium text-slate-500">
                                            {Object.values(h.logs).filter(Boolean).length} checks
                                        </td>
                                        <td className="px-8 py-6">
                                            {h.logs[todayStr] ? (
                                                <span className="text-emerald-500 font-bold flex items-center gap-1">
                                                    <i className="fas fa-check-circle"></i> Complete
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 font-bold flex items-center gap-1">
                                                    <i className="fas fa-circle-notch"></i> Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-morphism border-t border-slate-200 md:hidden flex justify-around p-3 z-50">
        {[
            { id: 'dashboard', icon: 'fa-th-large' },
            { id: 'habits', icon: 'fa-repeat' },
            { id: 'tasks', icon: 'fa-list-check' },
            { id: 'reports', icon: 'fa-chart-pie' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <i className={`fas ${item.icon} text-xl`}></i>
            </button>
          ))}
      </nav>
    </div>
  );
};

export default App;
