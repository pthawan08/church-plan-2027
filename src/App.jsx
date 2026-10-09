// ✨ VERSION: ULTIMATE V10 (FINAL PRINT FIX - isPrinting State)
import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { QRCodeSVG } from 'qrcode.react'

const defaultPlanForm = {
  t_mem:'', t_cell:'', t_lead:'', t_men:'',
  d1_1:'', d1_2:'', d1_3:'',
  d2_1_1:'', d2_1_2:'', d2_1_3:'', d2_2_1:'', d2_2_2:'', d2_2_3:'',
  d3_1:'', d3_1_1:'', d3_1_2:'', d3_1_3:'', d3_2:'', d3_2_1:'', d3_2_2:'', d3_2_3:'',
  d4_1:'', d4_1_1:'', d4_1_2:'', d4_1_3:'', d4_2:'', d4_2_1:'', d4_2_2:'', d4_2_3:'',
  d5_1:'', d6_1:'', d6_2:''
};

export default function App() {
  const [currentView, setCurrentView] = useState('login')
  const [userName, setUserName] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [planningLevel, setPlanningLevel] = useState('แขวง')

  const [allUsersList, setAllUsersList] = useState([])
  const [listZones, setListZones] = useState([])
  const [listKwang, setListKwang] = useState([])
  const [members, setMembers] = useState([])
  
  const [attendanceData, setAttendanceData] = useState([])
  const [isAttModalOpen, setIsAttModalOpen] = useState(false)
  const [isSavingAtt, setIsSavingAtt] = useState(false)
  const [attForm, setAttForm] = useState({ date: '', count: '' })

  const [adminAttLevel, setAdminAttLevel] = useState('แขวง')
  const [adminAttArea, setAdminAttArea] = useState('')
  const [adminAttData, setAdminAttData] = useState({})

  const [areaTarget, setAreaTarget] = useState('')
  const [showTargetSaved, setShowTargetSaved] = useState(false) 
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [memberForm, setMemberForm] = useState({
    id: null, title: '', firstName: '', lastName: '', nickName: '', dob: '', phone: '', email: '',
    role: '', unit: '', cell: '', zone: '', kwang: ''
  })

  const [myPlans, setMyPlans] = useState([])
  const [viewingPlan, setViewingPlan] = useState(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [feedbackInput, setFeedbackInput] = useState('')
  
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [planForm, setPlanForm] = useState(defaultPlanForm)

  // ✨ PRINT FIX: state ควบคุมโหมดปริ้น
  const [isPrinting, setIsPrinting] = useState(false)

  // ✨ PRINT FIX: ฟังก์ชันปริ้นที่แก้ปัญหากราฟ
  // วิธีการ: set isPrinting=true → React re-render กราฟด้วย pixel จริง → รอ 350ms → print
  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setIsPrinting(false), 1500)
    }, 350)
  }

  // CSS classes
  const iCls = `flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black ${isReadOnly ? 'text-gray-500 border-gray-300' : 'text-orange-600'}`;
  const nCls = `w-20 border-b border-orange-300 focus:outline-none focus:border-orange-600 bg-transparent text-center font-bold pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black ${isReadOnly ? 'text-gray-500 border-gray-300' : 'text-orange-600'}`;
  const tCls = `w-full border-2 rounded-xl p-3 mt-1 focus:outline-none focus:border-orange-500 font-medium bg-transparent resize-none h-20 print:h-auto print:min-h-[60px] transition-colors print:border-gray-400 print:text-black print:rounded-none print:p-2 ${isReadOnly ? 'border-gray-200 text-gray-600 bg-gray-50' : 'border-dotted border-orange-300 text-orange-700'}`;

  const b = (f) => ({ 
    value: planForm[f] || '', 
    onChange: e => {
      if (isReadOnly) return;
      const newPlan = {...planForm, [f]: e.target.value};
      setPlanForm(newPlan);
      const areaKey = planningLevel === 'คริสตจักร' ? 'คริสตจักร' : selectedArea;
      if (areaKey && !viewingPlan?.id) {
        localStorage.setItem('planForm_' + areaKey, JSON.stringify(newPlan));
      }
    },
    disabled: isReadOnly,
    readOnly: isReadOnly
  })

  const cellLeaderRoles = ['หัวหน้าเซลล์', 'หนซ.', 'หนซ'];
  const assistantRoles = ['ผู้ช่วยหัวหน้าเซลล์', 'ผช.หนซ.', 'ผช.หนซ'];
  const mentorRoles = ['ศบ.อาวุโส', 'ศบ.', 'พี่เลี้ยง', 'พล.', 'พล', ...assistantRoles, ...cellLeaderRoles, 'หัวหน้าหน่วย', 'หนน.', 'หนน', 'หัวหน้าแขวง', 'หนข.', 'หนข', 'หัวหน้าเขต', 'หนขต.', 'หนขต'];
  const kwangLeaderRoles = ['หัวหน้าแขวง', 'หนข.', 'หนข'];
  const zoneLeaderRoles = ['หัวหน้าเขต', 'หนขต.', 'หนขต'];

  const totalAttendance = attendanceData.reduce((sum, item) => sum + item.count, 0);
  const avgAttendance = attendanceData.length > 0 ? Math.round(totalAttendance / attendanceData.length) : 0;
  const percentage = areaTarget && Number(areaTarget) > 0 ? Math.round((avgAttendance / Number(areaTarget)) * 100) : 0;

  const liveUrl = "https://church-plan-2027.vercel.app/"

  const monthsQ3 = [
    { month: 'กรกฎาคม 2026', days: [{ date: '2026-07-05', label: 'อาทิตย์ 5 ก.ค.' }, { date: '2026-07-12', label: 'อาทิตย์ 12 ก.ค.' }, { date: '2026-07-19', label: 'อาทิตย์ 19 ก.ค.' }, { date: '2026-07-26', label: 'อาทิตย์ 26 ก.ค.' }] },
    { month: 'สิงหาคม 2026', days: [{ date: '2026-08-02', label: 'อาทิตย์ 2 ส.ค.' }, { date: '2026-08-09', label: 'อาทิตย์ 9 ส.ค.' }, { date: '2026-08-16', label: 'อาทิตย์ 16 ส.ค.' }, { date: '2026-08-23', label: 'อาทิตย์ 23 ส.ค.' }, { date: '2026-08-30', label: 'อาทิตย์ 30 ส.ค.' }] },
    { month: 'กันยายน 2026', days: [{ date: '2026-09-06', label: 'อาทิตย์ 6 ก.ย.' }, { date: '2026-09-13', label: 'อาทิตย์ 13 ก.ย.' }, { date: '2026-09-20', label: 'อาทิตย์ 20 ก.ย.' }, { date: '2026-09-27', label: 'อาทิตย์ 27 ก.ย.' }] }
  ];

  useEffect(() => {
    const areaKey = planningLevel === 'คริสตจักร' ? 'คริสตจักร' : selectedArea;
    if (areaKey) {
      const savedTarget = localStorage.getItem('target_' + areaKey) || '';
      setAreaTarget(savedTarget);
    }
  }, [selectedArea, planningLevel]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase.from('members').select('*')
        if (error) throw error
        setAllUsersList(data || [])
        const uniqueZones = [...new Set(data.map(item => item.Zone?.trim()).filter(z => z))]
        const uniqueKwang = [...new Set(data.map(item => item['แขวง']?.trim()).filter(k => k))]
        setListZones(uniqueZones.sort())
        setListKwang(uniqueKwang.sort())
      } catch (error) { console.error('Error fetching data:', error) } finally { setIsLoading(false) }
    }
    fetchData()
  }, [])

  const currentOptions = planningLevel === 'เขต' ? listZones : listKwang
  const adminOptions = adminAttLevel === 'เขต' ? listZones : listKwang
  
  const availableUsers = useMemo(() => {
    if (!selectedArea) return [];
    const safeSelectedArea = selectedArea.trim().toLowerCase();
    return allUsersList.filter(u => {
      const uArea = planningLevel === 'เขต' ? u.Zone : u['แขวง'];
      if (uArea?.trim().toLowerCase() !== safeSelectedArea) return false;
      const userRole = u['สถานะ']?.trim();
      if (planningLevel === 'แขวง') return kwangLeaderRoles.includes(userRole);
      if (planningLevel === 'เขต') return zoneLeaderRoles.includes(userRole);
      return false;
    }).map(u => u['ชื่อ-สกุล']?.trim()).sort();
  }, [allUsersList, selectedArea, planningLevel]);

  useEffect(() => {
    if (selectedArea && availableUsers.length > 0) {
      if (!availableUsers.includes(userName)) setUserName(availableUsers[0]);
    } else { setUserName(''); }
  }, [availableUsers, selectedArea]);

  const fetchMembers = async (level, area) => {
    let query = supabase.from('members').select('*').order('id', { ascending: true });
    if (level !== 'คริสตจักร') {
      const filterColumn = level === 'เขต' ? 'Zone' : 'แขวง';
      query = query.ilike(filterColumn, `%${area}%`);
    }
    const { data, error } = await query;
    if (error) throw error; 
    setMembers(data || []);
    return data || [];
  }

  const fetchAttendance = async (level, area) => {
    let query = supabase.from('attendance').select('*')
    if (level === 'เขต') query = query.ilike('zone', `%${area}%`)
    if (level === 'แขวง') query = query.ilike('kwang', `%${area}%`)
    const { data, error } = await query
    if (error) { console.error('Error fetching attendance:', error); return; }
    const grouped = (data || []).reduce((acc, curr) => {
      const d = curr.date; if (!acc[d]) acc[d] = 0;
      acc[d] += Number(curr.count || 0); return acc;
    }, {})
    const chartData = Object.keys(grouped).map(dateStr => {
      const dObj = new Date(dateStr)
      const display = dObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
      return { rawDate: dateStr, date: display, count: grouped[dateStr] }
    }).sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
    setAttendanceData(chartData)
  }

  const fetchPlans = async (level, area, memData) => {
    const { data, error } = await supabase.from('church_plans').select('*').order('id', { ascending: false });
    if (error || !data) return;
    if (level === 'แขวง') {
      setMyPlans(data.filter(p => p.level === 'แขวง' && p.area === area));
    } else if (level === 'เขต') {
      const kwangsInZone = [...new Set(memData.filter(m => m.Zone?.trim() === area).map(m => m['แขวง']?.trim()).filter(Boolean))];
      setMyPlans(data.filter(p => p.level === 'แขวง' && kwangsInZone.includes(p.area?.trim())));
    } else {
      setMyPlans(data);
    }
  }

  const zoneAggregated = useMemo(() => {
    if (planningLevel !== 'เขต') return null;
    let t_mem=0, t_cell=0, t_lead=0, t_men=0;
    myPlans.filter(p => p.status === 'submitted' || p.status === 'reviewed' || !p.status).forEach(p => {
       if (p.plan_data) {
          t_mem += Number(p.plan_data.t_mem || 0);
          t_cell += Number(p.plan_data.t_cell || 0);
          t_lead += Number(p.plan_data.t_lead || 0);
          t_men += Number(p.plan_data.t_men || 0);
       }
    });
    return { t_mem, t_cell, t_lead, t_men };
  }, [myPlans, planningLevel]);

  const currentAreaStats = useMemo(() => {
    const targetArea = viewingPlan ? viewingPlan.area : selectedArea;
    const targetLevel = viewingPlan ? viewingPlan.level : planningLevel;
    let filteredMembers = members;
    if (targetLevel === 'แขวง') {
       filteredMembers = members.filter(m => m['แขวง']?.trim() === targetArea?.trim());
    } else if (targetLevel === 'เขต') {
       filteredMembers = members.filter(m => m.Zone?.trim() === targetArea?.trim());
    }
    const memCount = filteredMembers.length;
    const cellCount = [...new Set(filteredMembers.map(m => m.Cell?.trim()).filter(Boolean))].length;
    const leaderCount = filteredMembers.filter(m => cellLeaderRoles.includes(m['สถานะ']?.trim())).length;
    const mentorCount = filteredMembers.filter(m => mentorRoles.includes(m['สถานะ']?.trim())).length;
    return { memCount, cellCount, leaderCount, mentorCount };
  }, [members, viewingPlan, selectedArea, planningLevel]);

  const handleLogin = async (e) => {
    e.preventDefault()
    const areaKey = planningLevel === 'คริสตจักร' ? 'คริสตจักร' : selectedArea;
    const savedPlan = localStorage.getItem('planForm_' + areaKey);
    if (savedPlan) {
      try { setPlanForm(JSON.parse(savedPlan)); } catch(err) { setPlanForm(defaultPlanForm); }
    } else {
      setPlanForm(defaultPlanForm);
    }
    setIsLoading(true)
    try {
      if (planningLevel === 'คริสตจักร') {
        const mData = await fetchMembers('คริสตจักร', ''); 
        await fetchAttendance('คริสตจักร', ''); 
        await fetchPlans('คริสตจักร', '', mData);
        setCurrentView('dashboard')
      } else if (userName && selectedArea) {
        const mData = await fetchMembers(planningLevel, selectedArea); 
        await fetchAttendance(planningLevel, selectedArea); 
        await fetchPlans(planningLevel, selectedArea, mData);
        setCurrentView('dashboard')
      } else { alert(`กรุณาเลือก${planningLevel}และชื่อผู้กรอก`) }
    } catch (error) { alert('เกิดข้อผิดพลาดในการดึงข้อมูล') } finally { setIsLoading(false) }
  }

  const handleSaveAttendance = async (e) => {
    e.preventDefault(); setIsSavingAtt(true)
    try {
      let z = ''; let k = '';
      if (planningLevel === 'แขวง') { k = selectedArea; z = members.length > 0 ? members.find(m => m.Zone)?.Zone || '' : ''; } 
      else if (planningLevel === 'เขต') { z = selectedArea; }
      const payload = { date: attForm.date, count: Number(attForm.count), kwang: k, zone: z, reporter: userName }
      const { error } = await supabase.from('attendance').insert([payload])
      if (error) throw error
      await fetchAttendance(planningLevel, selectedArea); setAttForm({ date: '', count: '' }); setIsAttModalOpen(false); alert('บันทึกสถิติสำเร็จ!');
    } catch (error) { alert('บันทึกสถิติไม่สำเร็จ: ' + error.message) } finally { setIsSavingAtt(false) }
  }

  const handleSaveAdminBatch = async (e) => {
    e.preventDefault()
    if (adminAttLevel !== 'คริสตจักร' && !adminAttArea) { alert('กรุณาเลือก แขวง หรือ เขต ก่อนครับ'); return; }
    setIsSavingAtt(true)
    try {
      const allDays = monthsQ3.flatMap(m => m.days);
      const payloads = allDays.filter(s => adminAttData[s.date] !== undefined && adminAttData[s.date] !== '').map(s => {
          let z = ''; let k = '';
          if (adminAttLevel === 'แขวง') { k = adminAttArea; z = allUsersList.find(m => m['แขวง'] === adminAttArea)?.Zone || ''; } 
          else if (adminAttLevel === 'เขต') { z = adminAttArea; }
          return { date: s.date, count: Number(adminAttData[s.date]), kwang: k, zone: z, reporter: 'เพลง (Admin)' }
        });
      if (payloads.length > 0) {
        const { error } = await supabase.from('attendance').insert(payloads)
        if (error) throw error
        alert('✅ บันทึกข้อมูลย้อนหลังสำเร็จเรียบร้อยครับ!'); setAdminAttData({}); setCurrentView('login'); 
      } else { alert('⚠ กรุณากรอกตัวเลขอย่างน้อย 1 วันครับ'); }
    } catch (error) { console.error('Batch error:', error); alert('❌ บันทึกสถิติไม่สำเร็จ: ' + error.message) } finally { setIsSavingAtt(false) }
  }

  const handleSavePlan = async (statusToSave) => {
    setIsSavingPlan(true);
    try {
      const payload = { level: planningLevel, area: selectedArea, reporter: userName, plan_data: planForm, status: statusToSave };
      if (viewingPlan?.id) {
        await supabase.from('church_plans').update(payload).eq('id', viewingPlan.id);
      } else {
        await supabase.from('church_plans').insert([payload]);
      }
      alert(statusToSave === 'draft' ? 'บันทึกฉบับร่างเรียบร้อยแล้ว! 💾' : 'ส่งแผนงานให้เขตสำเร็จ! 🚀');
      await fetchPlans(planningLevel, selectedArea, members);
      if (statusToSave === 'submitted') {
         setPlanForm(defaultPlanForm);
         setViewingPlan(null);
         setIsReadOnly(false);
         const areaKey = planningLevel === 'คริสตจักร' ? 'คริสตจักร' : selectedArea;
         localStorage.removeItem('planForm_' + areaKey);
         setCurrentView('success');
      }
    } catch (error) { alert('บันทึกไม่สำเร็จ: ' + error.message); } finally { setIsSavingPlan(false); }
  }

  const handleDeletePlan = async (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบแผนงานฉบับร่างนี้?\n(ลบแล้วจะไม่สามารถกู้คืนได้นะครับ)')) {
      try {
        const { error } = await supabase.from('church_plans').delete().eq('id', id);
        if (error) throw error;
        alert('ลบแผนงานเรียบร้อยแล้วครับ 🗑️');
        if (viewingPlan?.id === id) { setViewingPlan(null); setPlanForm(defaultPlanForm); setIsReadOnly(false); }
        await fetchPlans(planningLevel, selectedArea, members);
      } catch (err) { alert('ลบแผนไม่สำเร็จ: ' + err.message); }
    }
  }

  const handleSaveFeedback = async () => {
    try {
      await supabase.from('church_plans').update({ status: 'reviewed', feedback: feedbackInput }).eq('id', viewingPlan.id);
      alert('ส่งข้อเสนอแนะให้แขวงเรียบร้อยแล้ว! 💬');
      setFeedbackInput(''); setViewingPlan(null); setIsReadOnly(false); setPlanForm(defaultPlanForm);
      await fetchPlans(planningLevel, selectedArea, members);
    } catch (err) { alert('บันทึกข้อเสนอแนะไม่สำเร็จ: ' + err.message); }
  }

  const handleOpenAdd = () => {
    let autoZone = ''; let autoKwang = '';
    if (planningLevel === 'แขวง') { autoKwang = selectedArea; autoZone = members.length > 0 ? members.find(m => m.Zone)?.Zone || '' : ''; } 
    else if (planningLevel === 'เขต') { autoZone = selectedArea; }
    setMemberForm({ id: null, title: '', firstName: '', lastName: '', nickName: '', dob: '', phone: '', email: '', role: '', unit: '', cell: '', zone: autoZone, kwang: autoKwang })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (member) => {
    const fullName = member['ชื่อ-สกุล'] || '';
    const nameParts = fullName.trim().split(/\s+/);
    let t_first = fullName; let t_last = '';
    if (nameParts.length > 1) { t_last = nameParts.pop(); t_first = nameParts.join(' '); }
    setMemberForm({ id: member.id, title: '', firstName: t_first, lastName: t_last, nickName: member['ชื่อเล่น'] || '', dob: member['วันเกิด'] || '', phone: member['เบอร์โทร'] || '', email: member['อีเมล'] || '', role: member['สถานะ'] || '', unit: member['หน่วย'] || '', cell: member.Cell || '', zone: member.Zone || '', kwang: member['แขวง'] || '' })
    setIsModalOpen(true)
  }

  const handleSaveMember = async (e) => {
    e.preventDefault(); setIsSaving(true)
    try {
      const combinedName = `${memberForm.title} ${memberForm.firstName} ${memberForm.lastName}`.trim()
      const payload = { 'ชื่อ-สกุล': combinedName, 'ชื่อเล่น': memberForm.nickName, 'วันเกิด': memberForm.dob, 'เบอร์โทร': memberForm.phone, 'อีเมล': memberForm.email, 'สถานะ': memberForm.role, 'หน่วย': memberForm.unit, 'Cell': memberForm.cell, 'Zone': memberForm.zone, 'แขวง': memberForm.kwang }
      if (memberForm.id) {
        const { error } = await supabase.from('members').update(payload).eq('id', memberForm.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('members').insert([payload])
        if (error) throw error
      }
      await fetchMembers(planningLevel, selectedArea)
      const { data: allUsers } = await supabase.from('members').select('*')
      setAllUsersList(allUsers || [])
      setIsModalOpen(false)
    } catch (error) { alert('บันทึกไม่สำเร็จ: ' + error.message) } finally { setIsSaving(false) }
  }

  const uniqueZoneCount = [...new Set(members.map(m => m.Zone?.trim()).filter(z => z))].length
  const uniqueKwangCount = [...new Set(members.map(m => m['แขวง']?.trim()).filter(k => k))].length
  const uniqueUnitCount = [...new Set(members.map(m => m['หน่วย']?.trim()).filter(u => u))].length
  const uniqueCellCount = [...new Set(members.map(m => m.Cell?.trim()).filter(c => c))].length
  const sortedUnits = [...new Set(members.map(m => m['หน่วย']?.trim()).filter(Boolean))].sort();

  const dynamicCells = useMemo(() => {
    if (!memberForm.unit) return [...new Set(members.map(m => m.Cell?.trim()).filter(Boolean))].sort();
    return [...new Set(members.filter(m => m['หน่วย']?.trim() === memberForm.unit.trim()).map(m => m.Cell?.trim()).filter(Boolean))].sort();
  }, [members, memberForm.unit]);

  const groupedMembers = members.reduce((acc, member) => {
    const cellName = member.Cell?.trim() || 'ไม่มีระบุกลุ่มเซลล์';
    if (!acc[cellName]) acc[cellName] = [];
    acc[cellName].push(member); return acc;
  }, {});
  const sortedCells = Object.keys(groupedMembers).sort();

  const churchSummary = [...new Set(members.map(m => m.Zone?.trim()).filter(Boolean))].sort().map(zone => {
    const zMembers = members.filter(m => m.Zone?.trim() === zone);
    const kCount = [...new Set(zMembers.map(m => m['แขวง']?.trim()).filter(Boolean))].length;
    const uCount = [...new Set(zMembers.map(m => m['หน่วย']?.trim()).filter(Boolean))].length;
    const cCount = [...new Set(zMembers.map(m => m.Cell?.trim()).filter(Boolean))].length;
    return { zone, members: zMembers.length, kwangs: kCount, units: uCount, cells: cCount };
  });

  const getGridColsClass = () => {
    return planningLevel === 'แขวง' ? 'md:grid-cols-3 print:grid-cols-3' : 'md:grid-cols-4 print:grid-cols-4';
  };

  // ✨ PRINT FIX: BarChart content ที่ใช้ร่วมกันทั้ง 2 mode
  const BarChartContent = () => (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
      <XAxis dataKey="date" tick={{fill: '#ea580c', fontSize: 10, fontWeight: 'bold'}} angle={-45} textAnchor="end" axisLine={false} tickLine={false} height={80} />
      <YAxis domain={[0, 'auto']} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
      <Tooltip cursor={{fill: 'rgba(249, 115, 22, 0.05)'}} contentStyle={{borderRadius: '8px', border: 'none'}} />
      <Bar dataKey="count" fill="url(#colorUv)" radius={[4, 4, 0, 0]} barSize={30}>
        <LabelList dataKey="count" position="top" fill="#dc2626" fontWeight="900" fontSize={10} offset={5} />
      </Bar>
      <defs>
        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
          <stop offset="100%" stopColor="#f97316" stopOpacity={1}/>
        </linearGradient>
      </defs>
    </>
  );

  // ─────────────────────────────────────────────────────────────
  // VIEW: LOGIN
  // ─────────────────────────────────────────────────────────────
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white/80 p-10 rounded-3xl shadow-2xl max-w-md w-full border border-white backdrop-blur-xl relative">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-600 mb-2">ระบบวางแผน ปี 2027</h1>
            <p className="text-gray-500 font-bold">คริสตจักรแห่งนิมิตพิษณุโลก</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm">
              <p className="text-sm font-bold text-gray-700 mb-3">ระดับการใช้งาน:</p>
              <div className="flex flex-col gap-3">
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-orange-600 transition"><input type="radio" name="level" value="แขวง" checked={planningLevel === 'แขวง'} onChange={() => { setPlanningLevel('แขวง'); setSelectedArea(''); }} className="w-5 h-5 accent-orange-500" /><span className="font-bold">ระดับแขวง</span></label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-orange-600 transition"><input type="radio" name="level" value="เขต" checked={planningLevel === 'เขต'} onChange={() => { setPlanningLevel('เขต'); setSelectedArea(''); }} className="w-5 h-5 accent-orange-500" /><span className="font-bold">ระดับเขต</span></label>
                </div>
                <div className="pt-3 border-t border-orange-100 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-rose-600 transition"><input type="radio" name="level" value="คริสตจักร" checked={planningLevel === 'คริสตจักร'} onChange={() => { setPlanningLevel('คริสตจักร'); setSelectedArea(''); setUserName(''); }} className="w-5 h-5 accent-rose-500" /><span className="font-black text-rose-600">ระดับคริสตจักร (ดูภาพรวม)</span></label>
                </div>
              </div>
            </div>
            {planningLevel !== 'คริสตจักร' && (
              <>
                <div>
                  <label className="block text-gray-700 mb-2 font-bold">เลือก{planningLevel}ของคุณ</label>
                  <select className="w-full border-2 border-orange-100 p-4 rounded-2xl focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition-all disabled:bg-gray-100 text-gray-800 bg-white font-medium" value={selectedArea} onChange={(e) => { setSelectedArea(e.target.value); }} disabled={isLoading}>
                    <option value="">{isLoading ? "กำลังโหลดข้อมูล..." : `-- กรุณาเลือก${planningLevel} --`}</option>
                    {currentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 font-bold">ชื่อผู้ใช้งาน (ล็อกอิน)</label>
                  <select className="w-full border-2 border-orange-100 p-4 rounded-2xl focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition-all disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 bg-white font-medium" value={userName} onChange={(e) => setUserName(e.target.value)} disabled={!selectedArea || isLoading}>
                    <option value="">{!selectedArea ? `(โปรดเลือก${planningLevel}ก่อน)` : availableUsers.length > 0 ? `-- เลือกชื่อของคุณ --` : `❌ ไม่พบรายชื่อหัวหน้า${planningLevel}นี้`}</option>
                    {availableUsers.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              </>
            )}
            <button type="submit" disabled={isLoading || (planningLevel !== 'คริสตจักร' && (!userName || !selectedArea))} className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white p-4 rounded-2xl font-black text-xl hover:from-orange-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 transform hover:-translate-y-1">
              {isLoading ? "กำลังประมวลผล..." : (planningLevel === 'คริสตจักร' ? "ดูภาพรวม 📊" : "เข้าสู่ระบบ")}
            </button>
          </form>
        </div>
        <button onClick={() => setCurrentView('adminBatchAttendance')} className="mt-8 text-rose-500 hover:text-rose-700 font-bold bg-white/60 px-5 py-2.5 rounded-full border border-rose-200 shadow-sm backdrop-blur-md transition-all">🛠️ โหมดแอดมิน: กรอกสถิติย้อนหลัง (ก.ค. - ก.ย.)</button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW: ADMIN BATCH ATTENDANCE
  // ─────────────────────────────────────────────────────────────
  if (currentView === 'adminBatchAttendance') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100 p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-2xl w-full border border-white">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black text-rose-600">🛠️ แอดมิน: กรอกสถิติย้อนหลัง (Q3)</h1>
            <button onClick={() => setCurrentView('login')} className="text-gray-400 hover:text-gray-600 font-bold text-sm bg-gray-50 px-4 py-2 rounded-xl">✕ กลับหน้าแรก</button>
          </div>
          <form onSubmit={handleSaveAdminBatch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">ระดับ</label>
                <select value={adminAttLevel} onChange={e => { setAdminAttLevel(e.target.value); setAdminAttArea(''); }} className="w-full border-2 border-gray-100 p-3 rounded-xl font-bold text-gray-700">
                  <option value="แขวง">ระดับแขวง</option>
                  <option value="เขต">ระดับเขต</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">เลือก{adminAttLevel}</label>
                <select value={adminAttArea} onChange={e => setAdminAttArea(e.target.value)} required className="w-full border-2 border-gray-100 p-3 rounded-xl font-bold text-orange-600 bg-white">
                  <option value="">-- กรุณาเลือก --</option>
                  {adminOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-6 pr-2 border-t border-b border-gray-100 py-4">
              {monthsQ3.map(mGroup => (
                <div key={mGroup.month} className="space-y-3">
                  <h3 className="font-black text-orange-600 text-sm bg-orange-50 p-2 rounded-lg">{mGroup.month}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mGroup.days.map(d => (
                      <div key={d.date} className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-600">{d.label}</span>
                        <input type="number" min="0" placeholder="จำนวนคน" value={adminAttData[d.date] !== undefined ? adminAttData[d.date] : ''} onChange={e => setAdminAttData({...adminAttData, [d.date]: e.target.value})} className="w-24 border border-gray-200 p-1.5 rounded-lg text-center font-bold text-orange-600 bg-white" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button type="submit" disabled={isSavingAtt} className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white p-4 rounded-2xl font-black text-lg hover:shadow-lg transition-all disabled:opacity-70">
              {isSavingAtt ? 'กำลังบันทึกข้อมูล...' : '💾 บันทึกข้อมูลสถิติย้อนหลังทั้งหมด'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW: DASHBOARD
  // ─────────────────────────────────────────────────────────────
  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100 p-4 md:p-8 relative print:bg-white print:bg-none print:p-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            html, body { width: 100% !important; font-size: 11pt !important; color: black !important; }
            .avoid-page-break { page-break-inside: avoid !important; break-inside: avoid !important; }
            .force-new-page { page-break-before: always !important; break-before: page !important; }
            h2, h3, h4 { page-break-after: avoid !important; break-after: avoid !important; }
          }
        `}</style>

        {/* ✨ PRINT FIX: Overlay แจ้งผู้ใช้ระหว่างเตรียมปริ้น */}
        {isPrinting && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex items-center justify-center print:hidden">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-spin">⏳</div>
              <p className="font-black text-gray-700 text-xl">กำลังเตรียมกราฟสำหรับปริ้น...</p>
              <p className="text-gray-500 font-medium mt-2">รอสักครู่นะครับ</p>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-6 print:space-y-4 print:max-w-full print:w-full print:px-0">
          
          {/* Print Header */}
          <div className="hidden print:flex justify-between items-center border-b-2 border-orange-500 pb-4 mb-4 avoid-page-break">
            <div>
              <h1 className="text-2xl font-black text-gray-900">ระบบวางแผน ปี 2027</h1>
              <p className="text-sm text-gray-600 font-bold mt-1">ระดับ{planningLevel === 'คริสตจักร' ? 'คริสตจักรแห่งนิมิตพิษณุโลก' : `${planningLevel}: ${selectedArea}`}</p>
              {planningLevel !== 'คริสตจักร' && <p className="text-gray-500 text-xs mt-1">ผู้รับผิดชอบ: {userName}</p>}
            </div>
            <QRCodeSVG value={liveUrl} size={60} />
          </div>

          {/* Navbar */}
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
            <div>
              {planningLevel === 'คริสตจักร' ? (
                <h1 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-600">รายงานภาพรวมคริสตจักร</h1>
              ) : (
                <><h1 className="text-2xl md:text-3xl font-black text-gray-900">ระดับ{planningLevel}: <span className="text-gray-900">{selectedArea}</span></h1><p className="text-gray-600 font-bold mt-1">ผู้รับผิดชอบ: <span className="text-rose-600">{userName}</span></p></>
              )}
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-4 bg-orange-50/50 p-2.5 px-4 rounded-2xl border-2 border-dashed border-orange-300 w-full md:w-auto">
                <div className="bg-white p-1 rounded-xl shadow-sm border border-orange-100"><QRCodeSVG value={liveUrl} size={48} /></div>
                <div className="text-sm"><p className="font-black text-gray-800">ระบบฐานข้อมูล 2027</p><p className="text-gray-500 font-medium text-[11px]">สแกนเพื่อเปิดเว็บมือถือ</p></div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                {/* ✨ ใช้ handlePrint แทน window.print() */}
                <button onClick={handlePrint} className="flex-1 md:flex-none text-orange-700 bg-orange-100 hover:bg-orange-200 font-bold px-5 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm">
                  🖨 ปริ้นรายงาน
                </button>
                <button onClick={() => {setCurrentView('login'); setSelectedArea(''); setUserName('');}} className="text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold px-5 py-3 rounded-2xl transition-all flex items-center justify-center">ออกจากระบบ</button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className={`grid grid-cols-1 ${getGridColsClass()} gap-4 md:gap-6 print:gap-2 avoid-page-break`}>
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 rounded-3xl text-center shadow-md transform hover:-translate-y-1 transition-all print:shadow-none print:border print:border-gray-300 print:from-white print:to-white print:p-2 print:rounded-lg">
              <h3 className="font-bold text-white mb-1 print:text-gray-700 print:text-sm">สมาชิกทั้งหมด</h3>
              <p className="text-4xl font-black text-white print:text-gray-900 print:text-xl">{members.length} <span className="text-lg font-normal opacity-90 print:text-gray-600 print:text-xs">คน</span></p>
            </div>
            {(planningLevel === 'เขต' || planningLevel === 'คริสตจักร') && (
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-6 rounded-3xl text-center shadow-md transform hover:-translate-y-1 transition-all print:shadow-none print:border print:border-gray-300 print:from-white print:to-white print:p-2 print:rounded-lg">
                <h3 className="font-bold text-white mb-1 print:text-gray-700 print:text-sm">แขวงทั้งหมด</h3>
                <p className="text-4xl font-black text-white print:text-gray-900 print:text-xl">{uniqueKwangCount} <span className="text-lg font-normal opacity-90 print:text-gray-600 print:text-xs">แขวง</span></p>
              </div>
            )}
            {planningLevel === 'คริสตจักร' && (
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 rounded-3xl text-center shadow-md transform hover:-translate-y-1 transition-all print:shadow-none print:border print:border-gray-300 print:from-white print:to-white print:p-2 print:rounded-lg">
                <h3 className="font-bold text-white mb-1 print:text-gray-700 print:text-sm">เขตทั้งหมด</h3>
                <p className="text-4xl font-black text-white print:text-gray-900 print:text-xl">{uniqueZoneCount} <span className="text-lg font-normal opacity-90 print:text-gray-600 print:text-xs">เขต</span></p>
              </div>
            )}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-3xl text-center shadow-md transform hover:-translate-y-1 transition-all print:shadow-none print:border print:border-gray-300 print:from-white print:to-white print:p-2 print:rounded-lg">
              <h3 className="font-bold text-white mb-1 print:text-gray-700 print:text-sm">หน่วยทั้งหมด</h3>
              <p className="text-4xl font-black text-white print:text-gray-900 print:text-xl">{uniqueUnitCount} <span className="text-lg font-normal opacity-90 print:text-gray-600 print:text-xs">หน่วย</span></p>
            </div>
            {planningLevel !== 'คริสตจักร' && (
              <div className="bg-gradient-to-r from-teal-400 to-emerald-400 p-6 rounded-3xl text-center shadow-md transform hover:-translate-y-1 transition-all print:shadow-none print:border print:border-gray-300 print:from-white print:to-white print:p-2 print:rounded-lg">
                <h3 className="font-bold text-white mb-1 print:text-gray-700 print:text-sm">กลุ่มเซลล์ทั้งหมด</h3>
                <p className="text-4xl font-black text-white print:text-gray-900 print:text-xl">{uniqueCellCount} <span className="text-lg font-normal opacity-90 print:text-gray-600 print:text-xs">กลุ่ม</span></p>
              </div>
            )}
          </div>

          {/* 4 เสาหลัก คริสตจักร */}
          {planningLevel === 'คริสตจักร' && (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-white mt-6 avoid-page-break print:p-2 print:mt-4 print:border-none print:shadow-none">
              <div className="text-center mb-8 print:mb-4">
                <h2 className="text-2xl md:text-3xl font-black text-amber-800 print:text-lg print:text-black">สรุปภาพรวมคริสตจักรแห่งนิมิตพิษณุโลก</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-2 mt-12 print:mt-4">
                <div className="bg-[#fef3c7] rounded-3xl p-6 flex flex-col items-center text-center shadow-sm print:border print:border-gray-300 print:p-2 print:rounded-xl">
                  <h3 className="bg-[#d97706] text-white px-6 py-2 rounded-full text-xl font-black shadow-md -mt-10 mb-4 border-4 border-white print:-mt-4 print:text-sm print:border-2">คริสตจักร (CH)</h3>
                  <div className="text-6xl mb-2 print:hidden">⛪</div>
                  <p className="text-lg font-bold text-amber-900 print:text-xs">เฉลี่ย <span className="text-3xl font-black text-[#b45309] print:text-lg">584</span> คน/สัปดาห์</p>
                  <p className="text-sm font-bold text-amber-800 bg-[#fde68a] py-2 px-4 rounded-xl w-full print:text-xs print:py-1">คิดเป็น 97% ของเป้าหมาย หรือจำนวนสมาชิกทั้งหมด</p>
                </div>
                <div className="bg-[#ffedd5] rounded-3xl p-6 flex flex-col items-center text-center shadow-sm print:border print:border-gray-300 print:p-2 print:rounded-xl">
                  <h3 className="bg-[#ea580c] text-white px-6 py-2 rounded-full text-xl font-black shadow-md -mt-10 mb-4 border-4 border-white print:-mt-4 print:text-sm print:border-2">เซลล์ (CELL)</h3>
                  <div className="text-6xl mb-2 print:hidden">🏘️</div>
                  <p className="text-lg font-bold text-orange-900 print:text-xs">เฉลี่ย <span className="text-3xl font-black text-[#c2410c] print:text-lg">356</span> คน/สัปดาห์</p>
                  <p className="text-sm font-bold text-orange-800 bg-[#fed7aa] py-2 px-4 rounded-xl w-full print:text-xs print:py-1">คิดเป็น 59% ของสมาชิก</p>
                </div>
                <div className="bg-[#ffedd5] rounded-3xl p-6 flex flex-col items-center text-center shadow-sm print:border print:border-gray-300 print:p-2 print:rounded-xl">
                  <h3 className="bg-[#ea580c] text-white px-6 py-2 rounded-full text-xl font-black shadow-md -mt-10 mb-4 border-4 border-white print:-mt-4 print:text-sm print:border-2">พพช. (SBC)</h3>
                  <div className="text-6xl mb-2 print:hidden">📖</div>
                  <p className="text-lg font-bold text-orange-900 print:text-xs">เฉลี่ย <span className="text-3xl font-black text-[#c2410c] print:text-lg">144</span> คน/สัปดาห์</p>
                  <p className="text-sm font-bold text-orange-800 bg-[#fed7aa] py-2 px-4 rounded-xl w-full print:text-xs print:py-1">คิดเป็น 24% ของการมีส่วนร่วม</p>
                </div>
                <div className="bg-[#ecfccb] rounded-3xl p-6 flex flex-col items-center text-center shadow-sm print:border print:border-gray-300 print:p-2 print:rounded-xl">
                  <h3 className="bg-[#65a30d] text-white px-6 py-2 rounded-full text-xl font-black shadow-md -mt-10 mb-4 border-4 border-white print:-mt-4 print:text-sm print:border-2">การเลี้ยงดู (1:1)</h3>
                  <div className="text-6xl mb-2 print:hidden">🌱</div>
                  <p className="text-lg font-bold text-lime-900 print:text-xs">เฉลี่ย <span className="text-3xl font-black text-[#4d7c0f] print:text-lg">204</span> คน/สัปดาห์</p>
                  <p className="text-sm font-bold text-lime-800 bg-[#d9f99d] py-2 px-4 rounded-xl w-full print:text-xs print:py-1">คิดเป็น 34% ของการสร้างสาวกแบบส่วนตัว</p>
                </div>
              </div>
            </div>
          )}

          {/* ตารางประวัติแผนงาน */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-white mt-6 print:hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                <span className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl">📋</span> 
                {planningLevel === 'คริสตจักร' ? 'ประวัติแผนงานทั้งหมด' : (planningLevel === 'เขต' ? 'สถานะแผนงานของแขวงในเขต' : 'ประวัติแผนงานของแขวง')}
              </h2>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 text-sm">
                  <tr>
                    <th className="p-4 font-bold border-b border-gray-100">วันที่ส่งแผน</th>
                    <th className="p-4 font-bold border-b border-gray-100">ชื่อแขวง</th>
                    <th className="p-4 font-bold border-b border-gray-100">ผู้รับผิดชอบ</th>
                    <th className="p-4 font-bold border-b border-gray-100">สถานะ</th>
                    <th className="p-4 font-bold border-b border-gray-100 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {myPlans.length > 0 ? myPlans.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-600">{new Date(p.created_at || Date.now()).toLocaleDateString('th-TH')}</td>
                      <td className="p-4 font-black text-gray-800 text-base">{p.area}</td>
                      <td className="p-4 text-sm text-gray-600">{p.reporter}</td>
                      <td className="p-4">
                        {p.status === 'draft' && <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-xs font-black">📝 บันทึกร่าง</span>}
                        {p.status === 'submitted' && <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black border border-blue-200">⏳ รอเขตตรวจ</span>}
                        {p.status === 'reviewed' && <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-black border border-green-200">✅ เขตตรวจแล้ว</span>}
                        {!p.status && <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-black border border-green-200">✅ ส่งแล้ว (V1)</span>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {planningLevel === 'แขวง' && p.status === 'draft' ? (
                            <>
                              <button onClick={() => {setViewingPlan(p); setPlanForm(p.plan_data); setIsReadOnly(false); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });}} className="text-orange-600 font-bold text-sm bg-orange-50 px-4 py-2 rounded-xl hover:bg-orange-100 transition shadow-sm">แก้ไขต่อ ✏️</button>
                              <button onClick={() => handleDeletePlan(p.id)} className="text-red-600 font-bold text-sm bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition shadow-sm">ลบ 🗑</button>
                            </>
                          ) : planningLevel === 'เขต' && p.status === 'submitted' ? (
                            <button onClick={() => {setViewingPlan(p); setPlanForm(p.plan_data); setIsReadOnly(true); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });}} className="text-blue-600 font-bold text-sm bg-blue-50 px-5 py-2 rounded-xl hover:bg-blue-100 transition shadow-sm border border-blue-200">ตรวจ / แนะนำ 💬</button>
                          ) : (
                            <button onClick={() => {setViewingPlan(p); setPlanForm(p.plan_data); setIsReadOnly(true); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });}} className="text-gray-600 font-bold text-sm bg-gray-100 px-5 py-2 rounded-xl hover:bg-gray-200 transition shadow-sm">ดูข้อมูล 📄</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-400 font-bold text-lg">ยังไม่มีข้อมูลแผนงานในระบบ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* สรุปเป้าหมายรวมของเขต */}
          {planningLevel === 'เขต' && !viewingPlan && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 md:p-10 rounded-3xl shadow-sm border border-blue-100 mt-6 avoid-page-break print:p-4 print:border-gray-300 print:shadow-none print:mt-4">
              <div className="text-center mb-8 print:mb-4">
                <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-black border border-indigo-200 mb-4 inline-block print:border-none print:bg-transparent print:p-0">สรุปภาพรวมระดับเขต</span>
                <h2 className="text-2xl md:text-3xl font-black text-indigo-900 print:text-lg">เป้าหมายรวมของ {selectedArea} ปี 2027</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-white text-center print:border-gray-200 print:p-2"><p className="text-indigo-600 font-bold text-sm mb-1 print:text-xs">สมาชิกรวม</p><p className="text-4xl font-black text-indigo-900 print:text-lg">{zoneAggregated?.t_mem || 0} <span className="text-sm font-bold text-indigo-400 print:text-xs">คน</span></p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-white text-center print:border-gray-200 print:p-2"><p className="text-indigo-600 font-bold text-sm mb-1 print:text-xs">เซลล์ใหม่รวม</p><p className="text-4xl font-black text-indigo-900 print:text-lg">{zoneAggregated?.t_cell || 0} <span className="text-sm font-bold text-indigo-400 print:text-xs">กลุ่ม</span></p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-white text-center print:border-gray-200 print:p-2"><p className="text-indigo-600 font-bold text-sm mb-1 print:text-xs">หนซ. ใหม่รวม</p><p className="text-4xl font-black text-indigo-900 print:text-lg">{zoneAggregated?.t_lead || 0} <span className="text-sm font-bold text-indigo-400 print:text-xs">คน</span></p></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-white text-center print:border-gray-200 print:p-2"><p className="text-indigo-600 font-bold text-sm mb-1 print:text-xs">พี่เลี้ยงใหม่รวม</p><p className="text-4xl font-black text-indigo-900 print:text-lg">{zoneAggregated?.t_men || 0} <span className="text-sm font-bold text-indigo-400 print:text-xs">คน</span></p></div>
              </div>
            </div>
          )}

          {/* ✨ สถิติการมาร่วม — PRINT FIX: conditional render */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-white mt-6 avoid-page-break print:p-0 print:border-none print:shadow-none print:mt-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="bg-white border shadow-sm p-2 rounded-xl text-xl print:hidden">📊</span>
                  <h2 className="text-2xl font-black text-gray-800 print:text-lg">สถิติการมาร่วม</h2>
                </div>
                {planningLevel !== 'คริสตจักร' && (
                  <button onClick={() => setIsAttModalOpen(true)} className="print:hidden bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-1">+ กรอกสถิติสัปดาห์นี้</button>
                )}
              </div>
              <div className="text-right mt-4 md:mt-0 print:mt-0">
                <div className="flex items-center justify-end gap-3 mb-2 relative">
                  <p className="text-gray-700 font-bold text-base print:text-sm">เป้าหมายไตรมาส 3 :</p>
                  <div className="relative">
                    <input type="number" placeholder="ระบุเป้า" className="w-16 border-b-2 border-orange-300 text-center text-orange-600 font-black text-xl focus:outline-none bg-transparent print:border-none print:text-base print:text-black" value={areaTarget} onChange={(e) => { setAreaTarget(e.target.value); const areaKey = planningLevel === 'คริสตจักร' ? 'คริสตจักร' : selectedArea; localStorage.setItem('target_' + areaKey, e.target.value); setShowTargetSaved(true); setTimeout(() => setShowTargetSaved(false), 2000); }} />
                    {showTargetSaved && <span className="absolute -top-8 -right-2 text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-sm animate-pulse whitespace-nowrap print:hidden">💾 จำค่าแล้ว</span>}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <p className="text-gray-700 font-bold text-sm print:text-xs">ค่าเฉลี่ย : <span className="text-green-500 font-black text-lg print:text-sm">{avgAttendance}</span></p>
                  <span className={`px-3 py-1 rounded-full text-sm font-black print:border-none print:text-xs ${percentage >= 100 ? 'bg-green-50 text-green-600' : 'bg-pink-50 text-pink-600 border border-pink-100'}`}>{percentage} %</span>
                </div>
              </div>
            </div>
            
            {/* ✨ PRINT FIX: 
                - isPrinting=true  → ใช้ <BarChart width={680} height={280}> โดยตรง (pixel จริง ไม่ต้องรู้ container size)
                - isPrinting=false → ใช้ <ResponsiveContainer> ตามปกติ
            */}
            <div className="mt-4 print:mb-6" style={{ height: isPrinting ? '280px' : '450px' }}>
              {attendanceData.length > 0 ? (
                isPrinting ? (
                  <BarChart width={680} height={280} data={attendanceData} margin={{ top: 20, right: 20, left: -20, bottom: 60 }}>
                    <BarChartContent />
                  </BarChart>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceData} margin={{ top: 20, right: 20, left: -20, bottom: 60 }}>
                      <BarChartContent />
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-orange-200 rounded-3xl bg-orange-50/50 print:bg-white print:border-gray-300"><p className="text-orange-400 print:text-gray-500 font-bold text-sm">ยังไม่มีข้อมูลสถิติ</p></div>
              )}
            </div>
          </div>
        </div>

        {/* ตารางสรุปสมาชิก / รายชื่อ */}
        <div className="max-w-6xl mx-auto print:mt-4">
          {planningLevel === 'คริสตจักร' ? (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-white mt-6 avoid-page-break print:shadow-none print:border-none print:p-0 print:mt-4">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3 mb-6 print:text-lg print:mb-3"><span className="bg-purple-100 text-purple-600 p-2.5 rounded-xl print:hidden">📈</span> สรุปข้อมูลแยกตามเขต</h2>
              <div className="overflow-x-auto print:overflow-visible border border-gray-100 rounded-2xl print:border-gray-400 print:rounded-none">
                <table className="w-full text-center border-collapse whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100 print:border-gray-400 print:bg-gray-100 print:text-xs">
                    <tr><th className="p-3 font-bold text-left border-r print:border-gray-300">ชื่อเขต</th><th className="p-3 font-bold border-r print:border-gray-300">แขวง</th><th className="p-3 font-bold border-r print:border-gray-300">หน่วย</th><th className="p-3 font-bold border-r print:border-gray-300">กลุ่มเซลล์</th><th className="p-3 font-black text-orange-600">สมาชิก (คน)</th></tr>
                  </thead>
                  <tbody className="bg-white print:text-xs">
                    {churchSummary.map((summary, idx) => (
                      <tr key={idx} className="border-b border-gray-50 print:border-gray-300 hover:bg-orange-50/30 transition-colors"><td className="p-3 font-extrabold text-gray-800 text-left border-r print:border-gray-300">{summary.zone || '-'}</td><td className="p-3 text-gray-600 font-medium border-r print:border-gray-300">{summary.kwangs}</td><td className="p-3 text-gray-600 font-medium border-r print:border-gray-300">{summary.units}</td><td className="p-3 text-gray-600 font-medium border-r print:border-gray-300">{summary.cells}</td><td className="p-3 text-orange-600 font-black text-lg print:text-sm">{summary.members}</td></tr>
                    ))}
                    <tr className="bg-orange-50 print:bg-gray-100 font-black text-gray-900 border-t-2 border-orange-100 print:border-gray-400"><td className="p-3 text-left border-r print:border-gray-300">รวมทั้งหมด</td><td className="p-3 border-r print:border-gray-300">{uniqueKwangCount}</td><td className="p-3 border-r print:border-gray-300">{uniqueUnitCount}</td><td className="p-3 border-r print:border-gray-300">{uniqueCellCount}</td><td className="p-3 text-rose-600 text-xl print:text-base">{members.length}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-white mt-6 print:shadow-none print:border-none print:p-0 print:mt-4">
              <div className="flex justify-between items-center mb-6 print:mb-3">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3 print:text-lg"><span className="bg-sky-100 text-sky-600 p-2.5 rounded-xl print:hidden">👥</span> ฐานข้อมูลสมาชิก</h2>
                <button onClick={handleOpenAdd} className="print:hidden bg-gradient-to-r from-sky-400 to-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all">+ เพิ่มสมาชิกใหม่</button>
              </div>
              <div className="overflow-auto max-h-[500px] print:max-h-none print:overflow-visible pr-2 space-y-6 print:space-y-4">
                {sortedCells.map(cellName => (
                  <div key={cellName} className="avoid-page-break border border-gray-100 print:border-gray-400 rounded-2xl overflow-hidden shadow-sm print:shadow-none print:rounded-none">
                    <div className="bg-slate-50 print:bg-gray-100 border-b border-gray-100 print:border-gray-400 p-3 flex justify-between items-center"><h3 className="font-black text-slate-700 text-base print:text-sm flex items-center gap-2"><span className="text-sky-500 print:hidden">❖</span> กลุ่ม: {cellName}</h3><span className="bg-white text-sky-600 text-xs font-bold px-3 py-1 rounded-full border border-sky-100 print:border-gray-300 shadow-sm print:shadow-none print:text-black">{groupedMembers[cellName].length} คน</span></div>
                    <div className="overflow-x-auto print:overflow-visible">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-white text-gray-400 print:text-gray-600 text-[10px] uppercase tracking-wider border-b print:border-gray-300">
                          <tr><th className="p-2 font-bold">ชื่อ-สกุล</th><th className="p-2 font-bold">เบอร์โทร</th><th className="p-2 font-bold text-center">อายุ/เพศ</th><th className="p-2 font-bold">สถานะ</th><th className="p-2 font-bold text-center print:hidden">จัดการ</th></tr>
                        </thead>
                        <tbody className="bg-white text-sm print:text-xs">
                          {groupedMembers[cellName].map((m, i) => (
                            <tr key={m.id || i} className="border-b border-gray-50 print:border-gray-200 hover:bg-slate-50 transition-colors"><td className="p-2 font-bold text-gray-700">{m['ชื่อ-สกุล']} {m['ชื่อเล่น'] ? <span className="text-gray-400 font-medium ml-1">({m['ชื่อเล่น']})</span> : ''}</td><td className="p-2 text-gray-500">{m['เบอร์โทร'] || '-'}</td><td className="p-2 text-gray-500 text-center">{m['อายุ'] ? `${m['อายุ']} ปี` : '-'}</td><td className="p-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black print:border print:border-gray-300 print:bg-white print:text-black ${cellLeaderRoles.includes(m['สถานะ']) ? 'bg-orange-100 text-orange-700' : mentorRoles.includes(m['สถานะ']) ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{m['สถานะ'] || 'สมาชิก'}</span></td><td className="p-2 text-center print:hidden"><button onClick={() => handleOpenEdit(m)} className="text-sky-600 bg-sky-50 px-3 py-1 rounded-lg text-xs font-bold">แก้ไข</button></td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* แบบฟอร์ม 6 มิติ */}
        {(planningLevel === 'แขวง' || viewingPlan) && (
          <div className="max-w-5xl mx-auto mt-12 print:mt-8 print:max-w-full print:w-full print:px-0 force-new-page">
            <div className="bg-white p-8 md:p-14 shadow-sm rounded-3xl border border-gray-100 print:shadow-none print:border-none print:p-0">
              <form onSubmit={(e) => e.preventDefault()} className="text-gray-900">
                <div className="pb-4">
                  <div className="mb-8 pb-4 border-b-2 border-orange-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:mb-4 print:pb-2 print:border-black avoid-page-break">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 print:text-xl print:mb-2 flex items-center gap-3">แบบฟอร์มวางแผนรับใช้ 6 มิติ</h1>
                      <div className="flex flex-col md:flex-row md:items-end gap-6 text-lg font-medium text-gray-800 print:text-sm print:gap-4">
                        <div className="flex items-end gap-3"><span className="whitespace-nowrap">ชื่อ{viewingPlan ? viewingPlan.level : planningLevel}:</span><span className="border-b-2 border-dotted border-orange-300 flex-1 md:w-64 text-center font-bold text-orange-600 pb-1 px-2 print:border-black print:text-black">{viewingPlan ? viewingPlan.area : selectedArea}</span></div>
                        <div className="flex items-end gap-3"><span className="whitespace-nowrap">ผู้รับผิดชอบ:</span><span className="border-b-2 border-dotted border-orange-300 w-64 text-center font-bold text-orange-600 pb-1 px-2 print:border-black print:text-black">{viewingPlan ? viewingPlan.reporter : userName}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="avoid-page-break">
                    <h2 className="text-xl print:text-lg font-bold mb-4 flex items-center gap-2"><span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm print:border print:border-black print:bg-white print:text-black">1</span> เป้าหมายตัวเลขของ{viewingPlan ? viewingPlan.level : planningLevel}ในปี 2027</h2>
                    <div className="overflow-x-auto rounded-xl border border-orange-200 bg-white print:border-gray-400 print:rounded-none">
                      <table className="w-full border-collapse text-base print:text-sm">
                        <thead>
                          <tr className="bg-orange-100/60 text-[#c2410c] border-b border-orange-200 print:bg-gray-100 print:border-gray-400 print:text-black"><th className="p-3 text-left w-1/3 font-bold border-r border-orange-200 print:border-gray-400">รายการเป้าหมาย</th><th className="p-3 text-center w-1/3 font-bold border-r border-orange-200 print:border-gray-400">สภาพปัจจุบัน</th><th className="p-3 text-left w-1/3 font-bold">เป้าหมายปี 2027</th></tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-orange-200 print:border-gray-400">
                            <td className="p-3 font-bold text-gray-800 border-r border-orange-200 print:border-gray-400">จำนวนสมาชิกใน{viewingPlan ? viewingPlan.level : planningLevel}</td>
                            <td className="p-3 text-center text-gray-800 border-r border-orange-200 print:border-gray-400 font-medium">{currentAreaStats.memCount} คน</td>
                            <td className="p-3 bg-white"><div className="flex items-end gap-2"><input type="number" {...b('t_mem')} className={nCls} /><span className="font-bold text-gray-800 pb-1">คน</span></div></td>
                          </tr>
                          <tr className="border-b border-orange-200 print:border-gray-400">
                            <td className="p-3 font-bold text-gray-800 border-r border-orange-200 print:border-gray-400">จำนวนกลุ่มเซลล์</td>
                            <td className="p-3 text-center text-gray-800 border-r border-orange-200 print:border-gray-400 font-medium">{currentAreaStats.cellCount} กลุ่ม</td>
                            <td className="p-3 bg-white"><div className="flex items-end gap-2"><span className="font-bold text-gray-800 pb-1">ขยายใหม่</span><input type="number" {...b('t_cell')} className={nCls} /><span className="font-bold text-gray-800 pb-1">กลุ่ม</span></div></td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-gray-800 border-r border-orange-200 print:border-gray-400 align-top">การสร้างและพัฒนาผู้นำใหม่</td>
                            <td className="p-3 text-center text-gray-800 border-r border-orange-200 print:border-gray-400 font-medium align-top"><div className="space-y-2"><div><span className="font-bold text-lg print:text-base">{currentAreaStats.leaderCount}</span> คน <span className="text-xs text-gray-500">(หนซ.)</span></div><div><span className="font-bold text-lg print:text-base">{currentAreaStats.mentorCount}</span> คน <span className="text-xs text-gray-500">(พี่เลี้ยง)</span></div></div></td>
                            <td className="p-3 space-y-3 py-3 align-top bg-white"><div className="flex items-end gap-2"><span className="w-28 font-bold text-gray-800 pb-1 print:text-xs">หนซ. ใหม่</span><input type="number" {...b('t_lead')} className={nCls} /><span className="font-bold text-gray-800 pb-1 print:text-xs">คน</span></div><div className="flex items-end gap-2"><span className="w-28 font-bold text-gray-800 pb-1 print:text-xs">พี่เลี้ยงใหม่</span><input type="number" {...b('t_men')} className={nCls} /><span className="font-bold text-gray-800 pb-1 print:text-xs">คน</span></div></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 pt-6 text-base leading-relaxed text-gray-800 print:pt-4 print:space-y-6 print:text-sm">
                  <h2 className="text-xl print:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm print:border print:border-black print:bg-white print:text-black">2</span> การวางแผนตาม 6 มิติการขับเคลื่อนคริสตจักร</h2>
                  
                  <div className="pl-4 avoid-page-break">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg print:text-base">1. มิติด้านการเจริญเติบโตด้านปริมาณ (Quantitative Growth)</h3>
                    <div className="pl-6 space-y-2 print:space-y-2">
                      <div className="flex flex-wrap items-end gap-2"><span className="pb-1">1.1. เป้าหมายจำนวนสมาชิกที่เพิ่มขึ้นในปี 2027:</span><input type="number" {...b('d1_1')} className={nCls} /><span className="pb-1">คน</span></div>
                      <div className="flex flex-wrap items-end gap-2"><span className="pb-1">1.2. เป้าหมายการนำคนรับเชื่อใหม่:</span><input type="number" {...b('d1_2')} className={nCls} /><span className="pb-1">คน</span></div>
                      <div className="pt-1"><span className="block mb-1 font-bold">1.3. แผนการประกาศและนำวิญญาณ:</span><textarea {...b('d1_3')} className={tCls}></textarea></div>
                    </div>
                  </div>

                  <div className="pl-4 avoid-page-break">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg print:text-base">2. มิติด้านการพัฒนาสมาชิกให้มีคุณภาพ (Developing High Quality Member Resources)</h3>
                    <div className="pl-6 space-y-4 print:space-y-3">
                      <div>
                        <span className="block mb-2 font-bold">2.1. แผนการส่งเสริมให้สมาชิกทุกคนมีส่วนในการรับใช้อย่างน้อยคนละ 1 อย่าง</span>
                        <div className="pl-6 space-y-2 print:space-y-1">
                          <div className="flex items-end gap-3"><span className="pb-1">2.1.1.</span><input type="text" {...b('d2_1_1')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">2.1.2.</span><input type="text" {...b('d2_1_2')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">2.1.3.</span><input type="text" {...b('d2_1_3')} className={iCls} /></div>
                        </div>
                      </div>
                      <div>
                        <span className="block mb-2 font-bold">2.2. แผนการติดตามการมาคริสตจักรและเซลล์อย่างสม่ำเสมอ</span>
                        <div className="pl-6 space-y-2 print:space-y-1">
                          <div className="flex items-end gap-3"><span className="pb-1">2.2.1.</span><input type="text" {...b('d2_2_1')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">2.2.2.</span><input type="text" {...b('d2_2_2')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">2.2.3.</span><input type="text" {...b('d2_2_3')} className={iCls} /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pl-4 avoid-page-break">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg print:text-base">3. มิติด้านการบุกเบิกคริสตจักร กลุ่ม Cell และพันธกิจใหม่</h3>
                    <div className="pl-6 space-y-4 print:space-y-3">
                      <div>
                        <div className="flex flex-wrap items-end gap-2 mb-2"><span className="pb-1 font-bold">3.1. เป้าหมายการเปิดกลุ่มเซลล์ใหม่:</span><input type="number" {...b('d3_1')} className={nCls} /><span className="pb-1 font-bold">เซลล์</span></div>
                        <span className="block mb-2 pl-6 font-bold text-gray-700">วิธีการที่ทำให้ไปถึงเป้าหมาย</span>
                        <div className="pl-8 space-y-2 print:space-y-1">
                          <div className="flex items-end gap-3"><span className="pb-1">3.1.1.</span><input type="text" {...b('d3_1_1')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">3.1.2.</span><input type="text" {...b('d3_1_2')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">3.1.3.</span><input type="text" {...b('d3_1_3')} className={iCls} /></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-end gap-2 mb-2"><span className="pb-1 font-bold">3.2. พื้นที่ยุทธศาสตร์ที่ต้องการบุกเบิกเซลล์ใหม่:</span><input type="text" {...b('d3_2')} className={iCls} /></div>
                        <span className="block mb-2 pl-6 font-bold text-gray-700">วิธีการที่ทำให้ไปถึงเป้าหมาย</span>
                        <div className="pl-8 space-y-2 print:space-y-1">
                          <div className="flex items-end gap-3"><span className="pb-1">3.2.1.</span><input type="text" {...b('d3_2_1')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">3.2.2.</span><input type="text" {...b('d3_2_2')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">3.2.3.</span><input type="text" {...b('d3_2_3')} className={iCls} /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pl-4 avoid-page-break">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg print:text-base">4. มิติด้านการพัฒนาผู้นำและเสริมสร้างขีดความสามารถ (Leadership Capacity)</h3>
                    <div className="pl-6 space-y-4 print:space-y-3">
                      <div>
                        <div className="flex flex-wrap items-end gap-2 mb-2"><span className="pb-1 font-bold">4.1. เป้าหมายจำนวนการสร้างหัวหน้าเซลล์ใหม่:</span><input type="number" {...b('d4_1')} className={nCls} /><span className="pb-1 font-bold">คน</span></div>
                        <span className="block mb-2 pl-6 font-bold text-gray-700">วิธีการที่ทำให้ไปถึงเป้าหมาย</span>
                        <div className="pl-8 space-y-2 print:space-y-1">
                          <div className="flex items-end gap-3"><span className="pb-1">4.1.1.</span><input type="text" {...b('d4_1_1')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">4.1.2.</span><input type="text" {...b('d4_1_2')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">4.1.3.</span><input type="text" {...b('d4_1_3')} className={iCls} /></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-end gap-2 mb-2"><span className="pb-1 font-bold">4.2. เป้าหมายจำนวนการสร้างพี่เลี้ยงใหม่:</span><input type="number" {...b('d4_2')} className={nCls} /><span className="pb-1 font-bold">คน</span></div>
                        <span className="block mb-2 pl-6 font-bold text-gray-700">วิธีการที่ทำให้ไปถึงเป้าหมาย</span>
                        <div className="pl-8 space-y-2 print:space-y-1">
                          <div className="flex items-end gap-3"><span className="pb-1">4.2.1.</span><input type="text" {...b('d4_2_1')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">4.2.2.</span><input type="text" {...b('d4_2_2')} className={iCls} /></div>
                          <div className="flex items-end gap-3"><span className="pb-1">4.2.3.</span><input type="text" {...b('d4_2_3')} className={iCls} /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pl-4 avoid-page-break">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg print:text-base">5. มิติด้านการอธิษฐานและการนมัสการ (Prayer & Worship)</h3>
                    <div className="pl-6"><span className="block mb-2 font-bold">5.1. แผนการรณรงค์ให้สมาชิกเข้าร่วมโปรแกรมอธิษฐานให้ได้ 80% ขึ้นไป:</span><textarea {...b('d5_1')} className={tCls}></textarea></div>
                  </div>

                  <div className="pl-4 avoid-page-break">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg print:text-base">6. มิติด้านความสัมพันธ์ (Relationship - HCRI)</h3>
                    <div className="pl-6 space-y-4 print:space-y-3">
                      <div><span className="block mb-2 font-bold">6.1. แผนการเยี่ยมเยียนและดูแลกัน (Mutual Care):</span><textarea {...b('d6_1')} className={tCls}></textarea></div>
                      <div><span className="block mb-2 font-bold">6.2. กิจกรรมสร้างความเป็นน้ำหนึ่งใจเดียวกัน (Unity & Teamwork):</span><textarea {...b('d6_2')} className={tCls}></textarea></div>
                    </div>
                  </div>
                </div>

                {/* ปุ่มด้านล่าง */}
                {isReadOnly ? (
                  <div className="pt-8 print:hidden space-y-4 border-t-2 border-gray-100 mt-6">
                    {viewingPlan?.feedback && (
                      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
                        <h3 className="font-black text-amber-800 text-lg mb-2">💬 ข้อเสนอแนะจากหัวหน้าเขต:</h3>
                        <p className="text-amber-900 whitespace-pre-wrap font-medium">{viewingPlan.feedback}</p>
                      </div>
                    )}
                    {planningLevel === 'เขต' && viewingPlan?.status === 'submitted' && (
                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
                        <h3 className="font-black text-blue-800 text-lg mb-3">✍️ เพิ่มข้อเสนอแนะให้แขวง:</h3>
                        <textarea value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)} className="w-full border-2 border-blue-200 p-4 rounded-xl focus:outline-none focus:border-blue-400 min-h-[120px] text-blue-900 font-medium" placeholder="พิมพ์คำแนะนำ หรือสิ่งที่อยากให้แขวงเพิ่มเติมที่นี่..."></textarea>
                        <button type="button" onClick={handleSaveFeedback} className="mt-4 bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition shadow-sm w-full md:w-auto">✅ ส่งข้อเสนอแนะ & อนุมัติแผนงาน</button>
                      </div>
                    )}
                    <div className="flex flex-col md:flex-row gap-4 pt-4">
                      {/* ✨ ใช้ handlePrint แทน window.print() */}
                      <button type="button" onClick={handlePrint} className="w-full md:w-1/2 bg-orange-100 text-orange-700 font-bold py-4 rounded-xl hover:bg-orange-200 transition">🖨 ปริ้นแผนงานนี้ (PDF)</button>
                      <button type="button" onClick={() => {setViewingPlan(null); setPlanForm(defaultPlanForm); setIsReadOnly(false);}} className="w-full md:w-1/2 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition">❌ ปิดหน้าต่างนี้</button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-8 print:hidden flex flex-col md:flex-row gap-4 border-t-2 border-gray-100 mt-6">
                    <button type="button" onClick={() => handleSavePlan('draft')} disabled={isSavingPlan} className="md:w-1/3 bg-gray-100 text-gray-700 p-4 rounded-2xl font-black text-xl hover:bg-gray-200 transition-all border-2 border-gray-200 disabled:opacity-70">
                      {isSavingPlan ? 'กำลังบันทึก...' : '💾 บันทึกฉบับร่าง'}
                    </button>
                    <button type="button" onClick={() => handleSavePlan('submitted')} disabled={isSavingPlan} className="md:w-2/3 bg-gradient-to-r from-orange-500 to-rose-500 text-white p-4 rounded-2xl font-black text-xl hover:shadow-xl transition-all disabled:opacity-70 transform hover:-translate-y-1">
                      {isSavingPlan ? 'กำลังส่งข้อมูล...' : '🚀 ส่งแผนงานให้เขต (ล็อกการแก้ไข)'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Modal สถิติ */}
        {isAttModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 border border-white">
              <div className="flex justify-between items-center border-b border-gray-100 pb-5 mb-6"><h2 className="text-2xl font-black text-gray-800 flex items-center gap-3"><span className="bg-orange-100 text-orange-600 p-2 rounded-xl">📊</span> กรอกสถิติสัปดาห์นี้</h2><button onClick={() => setIsAttModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition bg-gray-50 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>
              <form onSubmit={handleSaveAttendance} className="space-y-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">วันที่ (วันอาทิตย์)</label><input type="date" required value={attForm.date} onChange={e => setAttForm({...attForm, date: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-400 outline-none transition text-gray-700 font-medium" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">จำนวนคนมาร่วม (คน)</label><input type="number" required min="0" value={attForm.count} onChange={e => setAttForm({...attForm, count: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-400 outline-none transition font-black text-lg text-orange-600" placeholder="ระบุจำนวนคน" /></div>
                <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-100"><button type="button" onClick={() => setIsAttModalOpen(false)} className="px-6 py-3.5 rounded-2xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition">ยกเลิก</button><button type="submit" disabled={isSavingAtt} className="px-8 py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:shadow-lg disabled:opacity-70 transition-all">{isSavingAtt ? 'กำลังบันทึก...' : 'บันทึกสถิติ'}</button></div>
              </form>
            </div>
          </div>
        )}

        {/* Modal สมาชิก */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl p-6 md:p-10 border border-white">
              <div className="flex justify-between items-center border-b border-gray-100 pb-5 mb-8"><h2 className="text-2xl font-black text-gray-800">{memberForm.id ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}</h2><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition bg-gray-50 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>
              <form onSubmit={handleSaveMember} className="space-y-6">
                <h3 className="font-bold text-lg text-gray-800 border-l-4 border-blue-500 pl-3">ข้อมูลส่วนตัว</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">คำนำหน้า (Title)</label><input type="text" placeholder="นาย, นาง, นางสาว" value={memberForm.title} onChange={e => setMemberForm({...memberForm, title: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">ชื่อ (First Name) <span className="text-red-500">*</span></label><input type="text" required value={memberForm.firstName} onChange={e => setMemberForm({...memberForm, firstName: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">นามสกุล (Last Name) <span className="text-red-500">*</span></label><input type="text" required value={memberForm.lastName} onChange={e => setMemberForm({...memberForm, lastName: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">ชื่อเล่น (Nick Name)</label><input type="text" value={memberForm.nickName} onChange={e => setMemberForm({...memberForm, nickName: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">วันเกิด (Date of Birth)</label><input type="date" value={memberForm.dob} onChange={e => setMemberForm({...memberForm, dob: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition text-gray-600 font-medium" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">เบอร์โทร (Phone Number)</label><input type="text" value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition" /></div>
                </div>
                <h3 className="font-bold text-lg text-gray-800 border-l-4 border-orange-500 pl-3 mt-6">สังกัดและหน้าที่</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">เขต (Zone) <span className="text-red-500">*</span></label>
                    <input type="text" list="zone-list" required placeholder="เลือกหรือพิมพ์ชื่อเขต" value={memberForm.zone} onChange={e => setMemberForm({...memberForm, zone: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-orange-50 focus:border-orange-400 outline-none transition font-bold text-orange-700" />
                    <datalist id="zone-list">{listZones.map(z => <option key={z} value={z} />)}</datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">แขวง (Kwang) <span className="text-red-500">*</span></label>
                    <input type="text" list="kwang-list" required placeholder="เลือกหรือพิมพ์ชื่อแขวง" value={memberForm.kwang} onChange={e => setMemberForm({...memberForm, kwang: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-orange-50 focus:border-orange-400 outline-none transition font-bold text-orange-700" />
                    <datalist id="kwang-list">{listKwang.map(k => <option key={k} value={k} />)}</datalist>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">สถานะ (Role) <span className="text-red-500">*</span></label>
                    <select required value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition font-medium">
                      <option value="">Select Role</option><option value="ผจ.">ผู้สนใจ (ผจ.)</option><option value="ผช.ใหม่">ผู้เชื่อใหม่ (ผช.ใหม่)</option><option value="ผช.">ผู้เชื่อ (ผช.)</option><option value="สมาชิก">สมาชิก</option><option value="พี่เลี้ยง">พี่เลี้ยง (พล.)</option><option value="ผช.หนซ.">ผช.หนซ.</option><option value="หนซ.">หัวหน้าเซลล์ (หนซ.)</option><option value="หนน.">หัวหน้าหน่วย (หนน.)</option><option value="หนข.">หัวหน้าแขวง (หนข.)</option><option value="หัวหน้าเขต">หัวหน้าเขต</option><option value="ศบ.">ศิษยาภิบาล (ศบ.)</option><option value="ศบ.อาวุโส">ศิษยาภิบาลอาวุโส (ศบ.อาวุโส)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">หน่วย (Unit)</label>
                    <input type="text" list="unit-list" placeholder="เลือกหรือพิมพ์ชื่อหน่วย" value={memberForm.unit} onChange={e => setMemberForm({...memberForm, unit: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition font-medium" />
                    <datalist id="unit-list">{sortedUnits.map(u => <option key={u} value={u} />)}</datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">กลุ่มเซลล์ (Cell)</label>
                    <input type="text" list="cell-list" placeholder="เลือกหรือพิมพ์ชื่อเซลล์" value={memberForm.cell} onChange={e => setMemberForm({...memberForm, cell: e.target.value})} className="w-full border-2 border-gray-100 p-3.5 rounded-xl focus:ring-4 focus:ring-orange-50 focus:border-orange-400 outline-none transition font-medium text-blue-600" />
                    <datalist id="cell-list">{dynamicCells.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition">ยกเลิก (Cancel)</button>
                  <button type="submit" disabled={isSaving} className="px-8 py-3.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 transition shadow-md disabled:opacity-70">{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสมาชิก'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW: SUCCESS
  // ─────────────────────────────────────────────────────────────
  if (currentView === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white p-14 rounded-3xl shadow-2xl text-center max-w-lg w-full border border-white">
          <div className="text-7xl mb-6 transform animate-bounce">🎉</div>
          <h1 className="text-3xl font-black text-gray-800 mb-3">บันทึกแผนงานสำเร็จ!</h1>
          <p className="text-gray-500 mb-10 font-bold text-lg">ข้อมูลแผนงานทั้งหมดถูกจัดเก็บเข้าสู่ระบบอย่างปลอดภัยเรียบร้อยแล้วครับ</p>
          <button onClick={() => { setCurrentView('dashboard') }} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white w-full p-4 rounded-2xl font-black text-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
            กลับสู่หน้าแดชบอร์ด
          </button>
        </div>
      </div>
    )
  }

  return null
}
