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

  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [memberForm, setMemberForm] = useState({
    id: null, title: '', firstName: '', lastName: '', nickName: '', dob: '', phone: '', email: '',
    role: '', unit: '', cell: '', zone: '', kwang: ''
  })

  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [planForm, setPlanForm] = useState(defaultPlanForm)

  const b = (f) => ({ 
    value: planForm[f] || '', 
    onChange: e => {
      const newPlan = {...planForm, [f]: e.target.value};
      setPlanForm(newPlan);
      const areaKey = planningLevel === 'คริสตจักร' ? 'คริสตจักร' : selectedArea;
      if (areaKey) {
        localStorage.setItem('planForm_' + areaKey, JSON.stringify(newPlan));
      }
    } 
  })

  const cellLeaderRoles = ['หัวหน้าเซลล์', 'หนซ.', 'หนซ'];
  const assistantRoles = ['ผู้ช่วยหัวหน้าเซลล์', 'ผช.หนซ.', 'ผช.หนซ'];
  const mentorRoles = ['ศบ.อาวุโส', 'ศบ.', 'พี่เลี้ยง', 'พล.', 'พล', ...assistantRoles, ...cellLeaderRoles, 'หัวหน้าหน่วย', 'หนน.', 'หนน', 'หัวหน้าแขวง', 'หนข.', 'หนข', 'หัวหน้าเขต', 'หนขต.', 'หนขต'];
  const kwangLeaderRoles = ['หัวหน้าแขวง', 'หนข.', 'หนข'];
  const zoneLeaderRoles = ['หัวหน้าเขต', 'หนขต.', 'หนขต'];

  const currentCellLeadersCount = members.filter(m => cellLeaderRoles.includes(m['สถานะ']?.trim())).length;
  const currentMentorCount = members.filter(m => mentorRoles.includes(m['สถานะ']?.trim())).length;

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
      const savedTarget = localStorage.getItem('target_' + areaKey) || localStorage.getItem('last_used_target') || '';
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
    if (level === 'คริสตจักร') {
      const { data, error } = await supabase.from('members').select('*').order('id', { ascending: true })
      if (error) throw error; setMembers(data)
    } else {
      const filterColumn = level === 'เขต' ? 'Zone' : 'แขวง'
      const { data, error } = await supabase.from('members').select('*').ilike(filterColumn, `%${area}%`).order('id', { ascending: true })
      if (error) throw error; setMembers(data)
    }
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
        await fetchMembers('คริสตจักร', ''); await fetchAttendance('คริสตจักร', ''); setCurrentView('dashboard')
      } else if (userName && selectedArea) {
        await fetchMembers(planningLevel, selectedArea); await fetchAttendance(planningLevel, selectedArea); setCurrentView('dashboard')
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

  const handleSavePlan = async (e) => {
    e.preventDefault(); setIsSavingPlan(true)
    try {
      const payload = { level: planningLevel, area: selectedArea, reporter: userName, plan_data: planForm }
      const { error } = await supabase.from('church_plans').insert([payload])
      if (error) throw error
      
      const areaKey = planningLevel === 'คริสตจักร' ? 'คริสตจักร' : selectedArea;
      localStorage.removeItem('planForm_' + areaKey);
      setCurrentView('success')
    } catch (error) { alert('บันทึกแผนงานไม่สำเร็จ: ' + error.message) } finally { setIsSavingPlan(false) }
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

  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white/80 p-10 rounded-3xl shadow-2xl max-w-md w-full border border-white backdrop-blur-xl relative">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-600 mb-2">วางแผน ปี 2027</h1>
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

  // ✨ หน้า Dashboard หลัก
  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100 p-4 md:p-8 relative print:bg-white print:bg-none print:p-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        
        {/* ✨ โค้ดลับไม้ตายสุดท้าย: แทรกสไตล์ทับระบบ Print ของเบราว์เซอร์ไปเลย บังคับตัวใหญ่! */}
        <style>{`
          @media print {
            .print-enlarge-text {
              font-size: 16pt !important;
              line-height: 1.8 !important;
            }
            .print-enlarge-text h1 { font-size: 24pt !important; font-weight: 900 !important; margin-bottom: 20px !important; }
            .print-enlarge-text h2 { font-size: 20pt !important; font-weight: 800 !important; margin-top: 25px !important; margin-bottom: 15px !important; }
            .print-enlarge-text h3 { font-size: 18pt !important; font-weight: bold !important; margin-top: 15px !important; margin-bottom: 10px !important; }
            .print-enlarge-text span, 
            .print-enlarge-text p, 
            .print-enlarge-text label,
            .print-enlarge-text div { 
              font-size: 16pt !important; 
            }
            .print-enlarge-text input[type="text"], 
            .print-enlarge-text input[type="number"] {
              font-size: 16pt !important;
              font-weight: bold !important;
              color: black !important;
              border-bottom: 1px solid black !important;
              height: auto !important;
            }
            .print-enlarge-text textarea {
              font-size: 16pt !important;
              color: black !important;
              min-height: 120px !important;
              border: 1px solid #666 !important;
            }
            .print-enlarge-text table, .print-enlarge-text th, .print-enlarge-text td {
              font-size: 16pt !important;
            }
          }
        `}</style>

        {/* --- 📄 หน้าที่ 1: แดชบอร์ดสรุปสถิติ --- */}
        <div className="max-w-6xl mx-auto space-y-6 print:space-y-6">
          
          <div className="hidden print:flex justify-between items-center border-b-2 border-orange-500 pb-6 mb-6">
            <div>
              <h1 className="text-4xl font-black text-gray-900">รายงานข้อมูลและแผนงาน ปี 2027</h1>
              <p className="text-xl text-gray-600 font-bold mt-2">ระดับ{planningLevel === 'คริสตจักร' ? 'คริสตจักรแห่งนิมิตพิษณุโลก' : `${planningLevel}: ${selectedArea}`}</p>
              {planningLevel !== 'คริสตจักร' && <p className="text-gray-500 font-medium mt-1">ผู้รับผิดชอบ: {userName}</p>}
            </div>
            <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-3xl border border-orange-200">
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-orange-100">
                <QRCodeSVG value={liveUrl} size={120} />
              </div>
              <div>
                <p className="font-black text-gray-800 text-lg">ระบบฐานข้อมูล 2027</p>
                <p className="text-gray-500 font-medium text-sm">สแกนเพื่อจัดการข้อมูล</p>
              </div>
            </div>
          </div>

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
                <div className="bg-white p-1 rounded-xl shadow-sm border border-orange-100">
                  <QRCodeSVG value={liveUrl} size={48} />
                </div>
                <div className="text-sm"><p className="font-black text-gray-800">ระบบฐานข้อมูล 2027</p><p className="text-gray-500 font-medium text-[11px]">สแกนเพื่อเปิดเว็บมือถือ</p></div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => window.print()} className="flex-1 md:flex-none text-orange-700 bg-orange-100 hover:bg-orange-200 font-bold px-5 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm">
                  🖨️ ปริ้นรายงานชุดสมบูรณ์
                </button>
                <button onClick={() => {setCurrentView('login'); setSelectedArea(''); setUserName('');}} className="text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold px-5 py-3 rounded-2xl transition-all flex items-center justify-center">ออกจากระบบ</button>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${planningLevel === 'แขวง' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 md:gap-6`}>
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 rounded-3xl text-center shadow-md transform hover:-translate-y-1 transition-all print:shadow-none print:border-2 print:border-rose-400 print:from-white print:to-white">
              <h3 className="font-bold text-white mb-1 print:text-rose-600">สมาชิกทั้งหมด</h3>
              <p className="text-4xl font-black text-white print:text-rose-700">{members.length} <span className="text-lg font-normal opacity-90 print:text-rose-500">คน</span></p>
            </div>
            {(planningLevel === 'เขต' || planningLevel === 'คริสตจักร') && (
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-6 rounded-3xl text-center shadow-md transform hover:-translate-y-1 transition-all print:shadow-none print:border-2 print:border-purple-400 print:from-white print:to-white">
                <h3 className="font-bold text-white mb-1 print:text-purple-600">แขวงทั้งหมด</h3>
                <p className="text-4xl font-black text-white print:text-purple-700">{uniqueKwangCount} <span className="text-lg font-normal opacity-90 print:text-purple-500">แขวง</span></p>
              </div>
            )}
            {planningLevel === 'คริสตจักร' && (
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 rounded-3xl text-center shadow-md transform hover:-translate-y-1 transition-all print:shadow-none print:border-2 print:border-blue-400 print:from-white print:to-white">
                <h3 className="font-bold text-white mb-1 print:text-blue-600">เขตทั้งหมด</h3>
                <p className="text-4xl font-black text-white print:text-blue-700">{uniqueZoneCount} <span className="text-lg font-normal opacity-90 print:text-blue-500">เขต</span></p>
              </div>
            )}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-3xl text-center shadow-md transform hover:-translate-y-1 transition-all print:shadow-none print:border-2 print:border-orange-400 print:from-white print:to-white">
              <h3 className="font-bold text-white mb-1 print:text-orange-600">หน่วยทั้งหมด</h3>
              <p className="text-4xl font-black text-white print:text-orange-700">{uniqueUnitCount} <span className="text-lg font-normal opacity-90 print:text-orange-500">หน่วย</span></p>
            </div>
            {planningLevel !== 'คริสตจักร' && (
              <div className="bg-gradient-to-r from-teal-400 to-emerald-400 p-6 rounded-3xl text-center shadow-md transform hover:-translate-y-1 transition-all print:shadow-none print:border-2 print:border-teal-400 print:from-white print:to-white">
                <h3 className="font-bold text-white mb-1 print:text-teal-600">กลุ่มเซลล์ทั้งหมด</h3>
                <p className="text-4xl font-black text-white print:text-teal-700">{uniqueCellCount} <span className="text-lg font-normal opacity-90 print:text-teal-500">กลุ่ม</span></p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-white print:shadow-none print:border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="bg-white border shadow-sm p-2 rounded-xl text-xl print:border-none print:p-0">📊</span>
                  <h2 className="text-2xl font-black text-gray-800">สถิติการมาร่วม</h2>
                </div>
                {planningLevel !== 'คริสตจักร' && (
                  <button onClick={() => setIsAttModalOpen(true)} className="print:hidden bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-1">+ กรอกสถิติสัปดาห์นี้</button>
                )}
              </div>
              <div className="text-right mt-4 md:mt-0 print:mt-0">
                <div className="flex items-center justify-end gap-3 mb-2">
                  <p className="text-gray-700 font-bold text-base">เป้าหมายไตรมาส 3 :</p>
                  <input type="number" placeholder="ระบุเป้า" className="w-16 border-b-2 border-orange-300 text-center text-orange-600 font-black text-xl focus:outline-none bg-transparent print:border-none" value={areaTarget} onChange={(e) => { 
                    setAreaTarget(e.target.value); 
                    const areaKey = planningLevel === 'คริสตจักร' ? 'คริสตจักร' : selectedArea; 
                    localStorage.setItem('target_' + areaKey, e.target.value); 
                    localStorage.setItem('last_used_target', e.target.value);
                  }} />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <p className="text-gray-700 font-bold text-sm md:text-base">ค่าเฉลี่ย : <span className="text-green-500 font-black text-lg">{avgAttendance}</span></p>
                  <span className={`px-3 py-1 rounded-full text-sm font-black ${percentage >= 100 ? 'bg-green-50 text-green-600' : 'bg-pink-50 text-pink-600 border border-pink-100 print:border-none'}`}>{percentage} %</span>
                </div>
              </div>
            </div>
            
            <div className="h-[450px] w-full mt-4 print:h-[400px]">
              {attendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData} margin={{ top: 30, right: 20, left: -20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tick={{fill: '#ea580c', fontSize: 12, fontWeight: 'bold'}} 
                      angle={-45} 
                      textAnchor="end" 
                      axisLine={false} 
                      tickLine={false} 
                      height={80} 
                      tickMargin={10}
                    />
                    <YAxis domain={[0, 'auto']} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'rgba(249, 115, 22, 0.05)'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="count" fill="url(#colorUv)" radius={[4, 4, 0, 0]} barSize={40}>
                      <LabelList dataKey="count" position="top" fill="#dc2626" fontWeight="900" fontSize={14} offset={10} />
                    </Bar>
                    <defs>
                      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#f97316" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-orange-200 rounded-3xl bg-orange-50/50 print:bg-white print:border-gray-300"><span className="text-5xl mb-3">📉</span><p className="text-orange-400 print:text-gray-500 font-bold text-xl">ยังไม่มีข้อมูลสถิติ</p></div>
              )}
            </div>
          </div>
        </div>

        {/* --- 📄 หน้าที่ 2: ตารางรายชื่อสมาชิก --- */}
        <div className="max-w-6xl mx-auto print:mt-8 print:break-before-page">
          {planningLevel === 'คริสตจักร' ? (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-white print:shadow-none print:border-none print:px-0">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3 mb-6"><span className="bg-purple-100 text-purple-600 p-2.5 rounded-xl print:bg-white print:border print:border-purple-200">📈</span> สรุปข้อมูลแยกตามเขต</h2>
              <div className="overflow-x-auto print:overflow-visible border border-gray-100 rounded-2xl print:border-gray-400">
                <table className="w-full text-center border-collapse whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100 print:border-gray-400 print:bg-gray-100">
                    <tr><th className="p-5 font-bold text-left border-r print:border-gray-300">ชื่อเขต</th><th className="p-5 font-bold border-r print:border-gray-300">จำนวนแขวง</th><th className="p-5 font-bold border-r print:border-gray-300">จำนวนหน่วย</th><th className="p-5 font-bold border-r print:border-gray-300">จำนวนกลุ่มเซลล์</th><th className="p-5 font-black text-orange-600">จำนวนสมาชิก (คน)</th></tr>
                  </thead>
                  <tbody className="bg-white">
                    {churchSummary.map((summary, idx) => (
                      <tr key={idx} className="border-b border-gray-50 print:border-gray-300 hover:bg-orange-50/30 transition-colors"><td className="p-5 font-extrabold text-gray-800 text-left border-r print:border-gray-300">{summary.zone || 'ไม่ได้ระบุเขต'}</td><td className="p-5 text-gray-600 font-medium border-r print:border-gray-300">{summary.kwangs} แขวง</td><td className="p-5 text-gray-600 font-medium border-r print:border-gray-300">{summary.units} หน่วย</td><td className="p-5 text-gray-600 font-medium border-r print:border-gray-300">{summary.cells} กลุ่ม</td><td className="p-5 text-orange-600 font-black text-xl">{summary.members}</td></tr>
                    ))}
                    <tr className="bg-orange-50 print:bg-orange-100 font-black text-gray-900 border-t-2 border-orange-100 print:border-gray-400"><td className="p-5 text-left border-r print:border-gray-300">รวมทั้งคริสตจักร</td><td className="p-5 border-r print:border-gray-300">{uniqueKwangCount} แขวง</td><td className="p-5 border-r print:border-gray-300">{uniqueUnitCount} หน่วย</td><td className="p-5 border-r print:border-gray-300">{uniqueCellCount} กลุ่ม</td><td className="p-5 text-rose-600 text-2xl">{members.length}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-white print:shadow-none print:border-none print:px-0 mt-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3"><span className="bg-sky-100 text-sky-600 p-2.5 rounded-xl print:bg-white print:border print:border-sky-200">👥</span> ฐานข้อมูลสมาชิก</h2>
                <button onClick={handleOpenAdd} className="print:hidden bg-gradient-to-r from-sky-400 to-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all">+ เพิ่มสมาชิกใหม่</button>
              </div>
              <div className="overflow-auto max-h-[500px] print:max-h-none print:overflow-visible pr-2 space-y-6">
                {sortedCells.map(cellName => (
                  <div key={cellName} className="border border-gray-100 print:border-gray-400 rounded-2xl overflow-hidden shadow-sm print:shadow-none print:break-inside-avoid">
                    <div className="bg-slate-50 print:bg-gray-100 border-b border-gray-100 print:border-gray-400 p-4 flex justify-between items-center"><h3 className="font-black text-slate-700 text-lg flex items-center gap-2"><span className="text-sky-500">❖</span> กลุ่ม: {cellName}</h3><span className="bg-white text-sky-600 text-sm font-bold px-4 py-1.5 rounded-full border border-sky-100 print:border-gray-300 shadow-sm print:shadow-none">{groupedMembers[cellName].length} คน</span></div>
                    <div className="overflow-x-auto print:overflow-visible">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-white text-gray-400 print:text-gray-600 text-xs uppercase tracking-wider">
                          <tr><th className="p-4 font-bold border-b border-gray-50 print:border-gray-300">ชื่อ-สกุล (ชื่อเล่น)</th><th className="p-4 font-bold border-b border-gray-50 print:border-gray-300">เบอร์โทร</th><th className="p-4 font-bold border-b border-gray-50 print:border-gray-300 text-center">อายุ/เพศ</th><th className="p-4 font-bold border-b border-gray-50 print:border-gray-300">สถานะ</th><th className="p-4 font-bold border-b border-gray-50 print:border-gray-300 text-center print:hidden">จัดการ</th></tr>
                        </thead>
                        <tbody className="bg-white">
                          {groupedMembers[cellName].map((m, i) => (
                            <tr key={m.id || i} className="border-b border-gray-50 print:border-gray-200 hover:bg-slate-50 transition-colors"><td className="p-4 font-bold text-gray-700">{m['ชื่อ-สกุล']} {m['ชื่อเล่น'] ? <span className="text-gray-400 font-medium ml-2">({m['ชื่อเล่น']})</span> : ''}</td><td className="p-4 text-gray-500 text-sm font-medium">{m['เบอร์โทร'] || '-'}</td><td className="p-4 text-gray-500 text-center text-sm font-medium">{m['อายุ'] ? `${m['อายุ']} ปี` : '-'} {m['เพศ'] ? `(${m['เพศ']})` : ''}</td><td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-black print:border print:border-gray-300 print:bg-white ${cellLeaderRoles.includes(m['สถานะ']) ? 'bg-orange-100 text-orange-700' : mentorRoles.includes(m['สถานะ']) ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{m['สถานะ'] || 'สมาชิก'}</span></td><td className="p-4 text-center print:hidden"><button onClick={() => handleOpenEdit(m)} className="text-gray-400 hover:text-sky-600 hover:bg-sky-50 px-4 py-2 rounded-xl transition text-sm font-bold">แก้ไข</button></td></tr>
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

        {/* --- 📄 หน้าที่ X: ฟอร์มแผนงาน 6 มิติ --- */}
        {/* ✨ เพิ่มคลาส print-enlarge-text ครอบฟอร์มทั้งหมดเพื่อให้ CSS ที่เราตั้งไว้ทำงาน */}
        <div className="max-w-5xl mx-auto mt-12 print:mt-8 print-enlarge-text">
          {planningLevel !== 'คริสตจักร' && (
            <div className="bg-white p-8 md:p-14 shadow-sm rounded-3xl border border-gray-100 print:shadow-none print:border-none print:p-0">
              
              <form onSubmit={handleSavePlan} className="text-gray-900">
                
                <div className="pb-4">
                  <div className="mb-12 pb-8 border-b-2 border-orange-200">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8 tracking-tight">แบบฟอร์มวางแผนรับใช้ 6 มิติ (ปี 2027)</h1>
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="bg-orange-300 w-2 h-6 rounded-full inline-block print:hidden"></span>ข้อมูล{planningLevel}และผู้รับผิดชอบ</h3>
                    <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-12 text-lg font-medium text-gray-800">
                      <div className="flex items-end gap-3 w-full md:w-auto"><span className="whitespace-nowrap">ชื่อ{planningLevel}:</span><span className="border-b-2 border-dotted border-orange-300 flex-1 md:w-64 text-center font-bold text-orange-600 pb-1 px-4">{selectedArea}</span></div>
                      <div className="flex items-end gap-3 w-full md:w-auto"><span className="whitespace-nowrap">ผู้รับผิดชอบ:</span><span className="border-b-2 border-dotted border-orange-300 flex-1 md:w-80 text-center font-bold text-orange-600 pb-1 px-4">{userName}</span></div>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-[#ea580c] rounded-2xl p-4 md:p-6 mb-8 relative shadow-sm print:border-orange-500">
                    <div className="absolute top-0 right-0 bg-[#1e293b] text-white font-bold py-1 px-4 rounded-bl-xl text-xs md:text-sm tracking-widest print:bg-white print:text-black print:border-b print:border-l print:border-orange-500">KPI 2027</div>
                    <h2 className="text-xl md:text-2xl font-black text-[#ea580c] mb-6 flex items-center gap-2 mt-1"><span className="bg-[#ffedd5] p-2 rounded-lg text-xl print:hidden">🎯</span> สรุปภาพรวมเป้าหมายคริสตจักร ปี 2027</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center mb-4">
                      <div className="bg-[#fff7ed] py-3 px-2 rounded-xl border border-[#ffedd5]"><p className="text-slate-700 font-bold text-sm md:text-base mb-1">เป้าหมายสมาชิก</p><p className="text-2xl md:text-3xl font-black text-[#ea580c]">1,000 <span className="text-sm font-bold text-slate-600">คน</span></p></div>
                      <div className="bg-[#fff7ed] py-3 px-2 rounded-xl border border-[#ffedd5]"><p className="text-slate-700 font-bold text-sm md:text-base mb-1">ผู้สนใจ</p><p className="text-2xl md:text-3xl font-black text-[#ea580c]">1,000 <span className="text-sm font-bold text-slate-600">คน</span></p></div>
                      <div className="bg-[#fff7ed] py-3 px-2 rounded-xl border border-[#ffedd5]"><p className="text-slate-700 font-bold text-sm md:text-base mb-1">ผู้รับเชื่อ</p><p className="text-2xl md:text-3xl font-black text-[#ea580c]">2,000 <span className="text-sm font-bold text-slate-600">คน</span></p></div>
                      <div className="bg-[#fff7ed] py-3 px-2 rounded-xl border border-[#ffedd5]"><p className="text-slate-700 font-bold text-sm md:text-base mb-1">ประกาศ</p><p className="text-2xl md:text-3xl font-black text-[#ea580c]">10,000 <span className="text-sm font-bold text-slate-600">คน</span></p></div>
                      <div className="bg-[#fff7ed] py-3 px-2 rounded-xl border border-[#ffedd5] col-span-2 md:col-span-1"><p className="text-slate-700 font-bold text-sm md:text-base mb-1">ตำบลเป้าหมาย</p><p className="text-2xl md:text-3xl font-black text-[#ea580c]">10 <span className="text-sm font-bold text-slate-600">แห่ง</span></p></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="bg-[#f8fafc] py-3 px-2 rounded-xl border border-gray-200"><p className="text-slate-700 font-bold text-sm md:text-base mb-1">หัวหน้าเซลล์ใหม่</p><p className="text-xl md:text-2xl font-black text-slate-800">150 <span className="text-sm font-bold text-slate-600">คน</span></p></div>
                      <div className="bg-[#f8fafc] py-3 px-2 rounded-xl border border-gray-200"><p className="text-slate-700 font-bold text-sm md:text-base mb-1">พี่เลี้ยงใหม่</p><p className="text-xl md:text-2xl font-black text-slate-800">300 <span className="text-sm font-bold text-slate-600">คน</span></p></div>
                      <div className="bg-[#f8fafc] py-3 px-2 rounded-xl border border-gray-200"><p className="text-slate-700 font-bold text-sm md:text-base mb-1">เซลล์ใหม่</p><p className="text-xl md:text-2xl font-black text-slate-800">150 <span className="text-sm font-bold text-slate-600">กลุ่ม</span></p></div>
                      <div className="bg-[#f8fafc] py-3 px-2 rounded-xl border border-gray-200"><p className="text-slate-700 font-bold text-sm md:text-base mb-1">พันธกิจใหม่</p><p className="text-xl md:text-2xl font-black text-slate-800">5-10 <span className="text-sm font-bold text-slate-600">พันธกิจ</span></p></div>
                    </div>
                    <div className="mt-4 bg-[#fff7ed] border border-[#fed7aa] py-3 px-5 rounded-xl flex flex-col md:flex-row justify-center items-center gap-4">
                      <p className="text-[#9a3412] font-black text-lg md:text-xl italic">" 50% ของ 1,000 คน เป็นทีมผู้นำ "</p>
                      <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-[#ffedd5]"><p className="text-[#c2410c] font-bold text-base md:text-lg">80%+ เข้าร่วมโปรแกรมอธิษฐาน</p></div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl print:text-2xl font-bold mb-4 flex items-center gap-2"><span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm print:border print:border-black print:bg-white print:text-black">1</span> เป้าหมายตัวเลขของ{planningLevel}ในปี 2027</h2>
                    <div className="overflow-x-auto rounded-xl border border-orange-200 bg-white">
                      <table className="w-full border-collapse text-base">
                        <thead>
                          <tr className="bg-orange-100/60 text-[#c2410c] border-b border-orange-200 print:border-gray-400 print:text-black"><th className="p-3 text-left w-1/3 font-bold border-r border-orange-200 print:border-gray-400">รายการเป้าหมาย</th><th className="p-3 text-center w-1/3 font-bold border-r border-orange-200 print:border-gray-400">สภาพปัจจุบัน</th><th className="p-3 text-left w-1/3 font-bold">เป้าหมายปี 2027</th></tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-orange-200 print:border-gray-400">
                            <td className="p-3 font-bold text-gray-800 border-r border-orange-200 print:border-gray-400">จำนวนสมาชิกใน{planningLevel}</td>
                            <td className="p-3 text-center text-gray-800 border-r border-orange-200 print:border-gray-400 font-medium">{members.length} คน</td>
                            <td className="p-3 bg-white"><div className="flex items-end gap-2"><input type="number" {...b('t_mem')} className="w-24 border-b border-orange-300 focus:outline-none focus:border-orange-600 bg-transparent text-center font-bold text-orange-600 pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black" /><span className="font-bold text-gray-800 pb-1">คน</span></div></td>
                          </tr>
                          <tr className="border-b border-orange-200 print:border-gray-400">
                            <td className="p-3 font-bold text-gray-800 border-r border-orange-200 print:border-gray-400">จำนวนกลุ่มเซลล์</td>
                            <td className="p-3 text-center text-gray-800 border-r border-orange-200 print:border-gray-400 font-medium">{uniqueCellCount} กลุ่ม</td>
                            <td className="p-3 bg-white"><div className="flex items-end gap-2"><span className="font-bold text-gray-800 pb-1">ขยายใหม่</span><input type="number" {...b('t_cell')} className="w-20 border-b border-orange-300 focus:outline-none focus:border-orange-600 bg-transparent text-center font-bold text-orange-600 pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black" /><span className="font-bold text-gray-800 pb-1">กลุ่ม</span></div></td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-gray-800 border-r border-orange-200 print:border-gray-400 align-top">การสร้างและพัฒนาผู้นำใหม่</td>
                            <td className="p-3 text-center text-gray-800 border-r border-orange-200 print:border-gray-400 font-medium align-top"><div className="space-y-2"><div><span className="font-bold text-lg print:text-xl">{currentCellLeadersCount}</span> คน <span className="text-sm text-gray-500">(หนซ.)</span></div><div><span className="font-bold text-lg print:text-xl">{currentMentorCount}</span> คน <span className="text-sm text-gray-500">(พี่เลี้ยง)</span></div></div></td>
                            <td className="p-3 space-y-3 py-4 align-top bg-white"><div className="flex items-end gap-2"><span className="w-32 font-bold text-gray-800 pb-1">หัวหน้าเซลล์ใหม่</span><input type="number" {...b('t_lead')} className="w-16 border-b border-orange-300 focus:outline-none focus:border-orange-600 bg-transparent text-center font-bold text-orange-600 pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black" /><span className="font-bold text-gray-800 pb-1">คน</span></div><div className="flex items-end gap-2"><span className="w-32 font-bold text-gray-800 pb-1">พี่เลี้ยงใหม่</span><input type="number" {...b('t_men')} className="w-16 border-b border-orange-300 focus:outline-none focus:border-orange-600 bg-transparent text-center font-bold text-orange-600 pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black" /><span className="font-bold text-gray-800 pb-1">คน</span></div></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                <div className="space-y-8 pt-8 mt-6">
                  <h2 className="text-xl print:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2"><span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm print:border print:border-black print:bg-white print:text-black">2</span> การวางแผนตาม 6 มิติการขับเคลื่อนคริสตจักร</h2>
                  
                  <div className="pl-4">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg print:text-xl">1. มิติด้านการเจริญเติบโตด้านปริมาณ (Quantitative Growth)</h3>
                    <div className="pl-6 space-y-3">
                      <div className="flex flex-wrap items-end gap-2"><span className="pb-1 text-base">1.1. เป้าหมายจำนวนสมาชิกใน{planningLevel}ที่เพิ่มขึ้นในปี 2027:</span><input type="number" {...b('d1_1')} className="border-b border-orange-300 w-24 text-center focus:outline-none focus:border-orange-600 text-orange-600 bg-transparent font-bold pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /><span className="pb-1 text-base">คน</span></div>
                      <div className="flex flex-wrap items-end gap-2"><span className="pb-1 text-base">1.2. เป้าหมายการนำคนรับเชื่อใหม่:</span><input type="number" {...b('d1_2')} className="border-b border-orange-300 w-24 text-center focus:outline-none focus:border-orange-600 text-orange-600 bg-transparent font-bold pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /><span className="pb-1 text-base">คน</span></div>
                      <div className="pt-2"><span className="block mb-2 text-base font-bold">1.3. แผนการประกาศและนำวิญญาณ:</span><textarea {...b('d1_3')} className="w-full border-2 border-dotted border-orange-300 rounded-xl p-3 mt-1 focus:outline-none focus:border-orange-500 text-orange-700 font-medium bg-transparent resize-none h-24 transition-colors print:border-gray-400 print:text-black text-base"></textarea></div>
                    </div>
                  </div>

                  <div className="pl-4">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg print:text-xl">2. มิติด้านการพัฒนาสมาชิกให้มีคุณภาพ (Developing High Quality Member Resources)</h3>
                    <div className="pl-6 space-y-4">
                      <div>
                        <span className="block mb-2 font-bold text-base">2.1. แผนการส่งเสริมให้สมาชิกทุกคนมีส่วนในการรับใช้อย่างน้อยคนละ 1 อย่าง</span>
                        <div className="pl-6 space-y-2">
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">2.1.1.</span><input type="text" {...b('d2_1_1')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">2.1.2.</span><input type="text" {...b('d2_1_2')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">2.1.3.</span><input type="text" {...b('d2_1_3')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                        </div>
                      </div>
                      <div>
                        <span className="block mb-2 font-bold text-base">2.2. แผนการติดตามการมาคริสตจักรและเซลล์อย่างสม่ำเสมอ</span>
                        <div className="pl-6 space-y-2">
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">2.2.1.</span><input type="text" {...b('d2_2_1')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">2.2.2.</span><input type="text" {...b('d2_2_2')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">2.2.3.</span><input type="text" {...b('d2_2_3')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pl-4">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg print:text-xl">3. มิติด้านการบุกเบิกคริสตจักร กลุ่ม Cell และพันธกิจใหม่</h3>
                    <div className="pl-6 space-y-4">
                      <div>
                        <div className="flex flex-wrap items-end gap-2 mb-2"><span className="pb-1 text-base font-bold">3.1. เป้าหมายการเปิดกลุ่มเซลล์ใหม่ใน{planningLevel}:</span><input type="number" {...b('d3_1')} className="border-b border-orange-300 w-24 text-center focus:outline-none focus:border-orange-600 text-orange-600 font-bold bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /><span className="pb-1 text-base font-bold">เซลล์</span></div>
                        <span className="block mb-2 pl-6 font-bold text-gray-700 text-base">วิธีการที่ทำให้ไปถึงเป้าหมาย</span>
                        <div className="pl-8 space-y-2">
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">3.1.1.</span><input type="text" {...b('d3_1_1')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">3.1.2.</span><input type="text" {...b('d3_1_2')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">3.1.3.</span><input type="text" {...b('d3_1_3')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-end gap-2 mb-2"><span className="pb-1 text-base font-bold">3.2. พื้นที่ยุทธศาสตร์ที่ต้องการบุกเบิกเซลล์ใหม่:</span><input type="text" {...b('d3_2')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-bold bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                        <span className="block mb-2 pl-6 font-bold text-gray-700 text-base">วิธีการที่ทำให้ไปถึงเป้าหมาย</span>
                        <div className="pl-8 space-y-2">
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">3.2.1.</span><input type="text" {...b('d3_2_1')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">3.2.2.</span><input type="text" {...b('d3_2_2')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">3.2.3.</span><input type="text" {...b('d3_2_3')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pl-4">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg print:text-xl">4. มิติด้านการพัฒนาผู้นำและเสริมสร้างขีดความสามารถ (Leadership Capacity)</h3>
                    <div className="pl-6 space-y-4">
                      <div>
                        <div className="flex flex-wrap items-end gap-2 mb-2"><span className="pb-1 text-base font-bold">4.1. เป้าหมายจำนวนการสร้างหัวหน้าเซลล์ใหม่:</span><input type="number" {...b('d4_1')} className="border-b border-orange-300 w-24 text-center focus:outline-none focus:border-orange-600 text-orange-600 font-bold bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /><span className="pb-1 text-base font-bold">คน</span></div>
                        <span className="block mb-2 pl-6 font-bold text-gray-700 text-base">วิธีการที่ทำให้ไปถึงเป้าหมาย</span>
                        <div className="pl-8 space-y-2">
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">4.1.1.</span><input type="text" {...b('d4_1_1')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">4.1.2.</span><input type="text" {...b('d4_1_2')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">4.1.3.</span><input type="text" {...b('d4_1_3')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-end gap-2 mb-2"><span className="pb-1 text-base font-bold">4.2. เป้าหมายจำนวนการสร้างพี่เลี้ยงใหม่:</span><input type="number" {...b('d4_2')} className="border-b border-orange-300 w-24 text-center focus:outline-none focus:border-orange-600 text-orange-600 font-bold bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /><span className="pb-1 text-base font-bold">คน</span></div>
                        <span className="block mb-2 pl-6 font-bold text-gray-700 text-base">วิธีการที่ทำให้ไปถึงเป้าหมาย</span>
                        <div className="pl-8 space-y-2">
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">4.2.1.</span><input type="text" {...b('d4_2_1')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">4.2.2.</span><input type="text" {...b('d4_2_2')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                          <div className="flex items-end gap-3"><span className="pb-1 text-base">4.2.3.</span><input type="text" {...b('d4_2_3')} className="flex-1 border-b border-orange-300 focus:outline-none focus:border-orange-600 text-orange-600 font-medium bg-transparent pb-1 transition-colors print:border-dotted print:border-gray-500 print:text-black text-base" /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pl-4">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg print:text-xl">5. มิติด้านการอธิษฐานและการนมัสการ (Prayer & Worship)</h3>
                    <div className="pl-6"><span className="block mb-2 font-bold text-base">5.1. แผนการรณรงค์ให้สมาชิกใน{planningLevel}เข้าร่วมโปรแกรมอธิษฐานให้ได้ 80% ขึ้นไป:</span><textarea {...b('d5_1')} className="w-full border-2 border-dotted border-orange-300 rounded-xl p-3 mt-1 focus:outline-none focus:border-orange-500 text-orange-700 font-medium bg-transparent resize-none h-24 transition-colors print:border-gray-400 print:text-black text-base"></textarea></div>
                  </div>

                  <div className="pl-4">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg print:text-xl">6. มิติด้านความสัมพันธ์ (Relationship - HCRI)</h3>
                    <div className="pl-6 space-y-4">
                      <div><span className="block mb-2 font-bold text-base">6.1. แผนการเยี่ยมเยียนและดูแลกัน (Mutual Care):</span><textarea {...b('d6_1')} className="w-full border-2 border-dotted border-orange-300 rounded-xl p-3 mt-1 focus:outline-none focus:border-orange-500 text-orange-700 font-medium bg-transparent resize-none h-24 transition-colors print:border-gray-400 print:text-black text-base"></textarea></div>
                      <div><span className="block mb-2 font-bold text-base">6.2. กิจกรรมสร้างความเป็นน้ำหนึ่งใจเดียวกันใน{planningLevel} (Unity & Teamwork):</span><textarea {...b('d6_2')} className="w-full border-2 border-dotted border-orange-300 rounded-xl p-3 mt-1 focus:outline-none focus:border-orange-500 text-orange-700 font-medium bg-transparent resize-none h-24 transition-colors print:border-gray-400 print:text-black text-base"></textarea></div>
                    </div>
                  </div>

                </div>

                <div className="pt-10 print:hidden">
                  <button type="submit" disabled={isSavingPlan} className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white p-5 rounded-2xl font-black text-xl hover:shadow-xl hover:shadow-orange-200 transition-all transform hover:-translate-y-1 tracking-wide disabled:opacity-70">
                    {isSavingPlan ? 'กำลังบันทึกข้อมูล...' : 'บันทึกแบบฟอร์มเข้าสู่ระบบ 🚀'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal เพิ่มสถิติ (ซ่อนตอนปริ้น) */}
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

        {/* Modal เพิ่มสมาชิก (ซ่อนตอนปริ้น) */}
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