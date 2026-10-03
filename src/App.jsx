import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

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
  const [planForm, setPlanForm] = useState({
    t_mem:'', t_cell:'', t_lead:'', t_men:'',
    d1_1:'', d1_2:'', d1_3:'',
    d2_1_1:'', d2_1_2:'', d2_1_3:'', d2_2_1:'', d2_2_2:'', d2_2_3:'',
    d3_1:'', d3_1_1:'', d3_1_2:'', d3_1_3:'', d3_2:'', d3_2_1:'', d3_2_2:'', d3_2_3:'',
    d4_1:'', d4_1_1:'', d4_1_2:'', d4_1_3:'', d4_2:'', d4_2_1:'', d4_2_2:'', d4_2_3:'',
    d5_1:'', d6_1:'', d6_2:''
  })

  const b = (f) => ({ value: planForm[f], onChange: e => setPlanForm({...planForm, [f]: e.target.value}) })

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
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(liveUrl)}`

  const monthsQ3 = [
    { month: 'กรกฎาคม 2026', days: [{ date: '2026-07-05', label: 'อาทิตย์ 5 ก.ค.' }, { date: '2026-07-12', label: 'อาทิตย์ 12 ก.ค.' }, { date: '2026-07-19', label: 'อาทิตย์ 19 ก.ค.' }, { date: '2026-07-26', label: 'อาทิตย์ 26 ก.ค.' }] },
    { month: 'สิงหาคม 2026', days: [{ date: '2026-08-02', label: 'อาทิตย์ 2 ส.ค.' }, { date: '2026-08-09', label: 'อาทิตย์ 9 ส.ค.' }, { date: '2026-08-16', label: 'อาทิตย์ 16 ส.ค.' }, { date: '2026-08-23', label: 'อาทิตย์ 23 ส.ค.' }, { date: '2026-08-30', label: 'อาทิตย์ 30 ส.ค.' }] },
    { month: 'กันยายน 2026', days: [{ date: '2026-09-06', label: 'อาทิตย์ 6 ก.ย.' }, { date: '2026-09-13', label: 'อาทิตย์ 13 ก.ย.' }, { date: '2026-09-20', label: 'อาทิตย์ 20 ก.ย.' }, { date: '2026-09-27', label: 'อาทิตย์ 27 ก.ย.' }] }
  ];

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
    const savedTarget = localStorage.getItem('target_' + areaKey) || '';
    setAreaTarget(savedTarget);

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
      </div>
    )
  }

  // ✨ หน้า Dashboard (พร้อม QR Code รูปภาพ API แสดงผลแน่นอน 100%)
  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100 p-4 md:p-8">
        
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              {planningLevel === 'คริสตจักร' ? (
                <h1 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-600">รายงานภาพรวมคริสตจักร</h1>
              ) : (
                <><h1 className="text-2xl md:text-3xl font-black text-gray-900">ระดับ{planningLevel}: <span className="text-gray-900">{selectedArea}</span></h1><p className="text-gray-600 font-bold mt-1">ผู้รับผิดชอบ: <span className="text-rose-600">{userName}</span></p></>
              )}
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-4 bg-orange-50/50 p-2.5 px-4 rounded-2xl border-2 border-dashed border-orange-300 w-full md:w-auto">
                <div className="flex items-center justify-center p-1 bg-white rounded-xl shadow-sm">
                  <img src={qrImageUrl} alt="QR Code" className="w-12 h-12" />
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

          {/* สถิติการมาร่วม */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3"><span className="bg-white border shadow-sm p-2 rounded-xl text-xl">📊</span><h2 className="text-2xl font-black text-gray-800">สถิติการมาร่วม</h2></div>
                {planningLevel !== 'คริสตจักร' && <button onClick={() => setIsAttModalOpen(true)} className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-all">+ กรอกสถิติสัปดาห์นี้</button>}
              </div>
              <div className="text-right mt-4 md:mt-0">
                <div className="flex items-center justify-end gap-3 mb-2">
                  <p className="text-gray-700 font-bold text-base">เป้าหมายไตรมาส 3 :</p>
                  <input type="number" placeholder="ระบุเป้า" className="w-16 border-b-2 border-orange-300 text-center text-orange-600 font-black text-xl focus:outline-none bg-transparent" value={areaTarget} onChange={(e) => { setAreaTarget(e.target.value); const areaKey = planningLevel === 'คริสตจักร' ? 'คริสตจักร' : selectedArea; localStorage.setItem('target_' + areaKey, e.target.value); }} />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <p className="text-gray-700 font-bold text-base">ค่าเฉลี่ย : <span className="text-green-500 font-black text-lg">{avgAttendance}</span></p>
                  <span className={`px-3 py-1 rounded-full text-sm font-black ${percentage >= 100 ? 'bg-green-50 text-green-600' : 'bg-pink-50 text-pink-600'}`}>{percentage} %</span>
                </div>
              </div>
            </div>
            <div className="h-80 w-full mt-4">
              {attendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%"><BarChart data={attendanceData} margin={{ top: 25, right: 0, left: -20, bottom: 25 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="date" tick={{fill: '#ea580c', fontSize: 11, fontWeight: 'bold'}} angle={-45} textAnchor="end" axisLine={false} tickLine={false} /><YAxis domain={[0, 'auto']} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} axisLine={false} tickLine={false} /><Tooltip cursor={{fill: 'rgba(249, 115, 22, 0.05)'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} /><Bar dataKey="count" fill="url(#colorUv)" radius={[4, 4, 0, 0]} barSize={40}><LabelList dataKey="count" position="top" fill="#dc2626" fontWeight="900" fontSize={12} offset={10} /></Bar><defs><linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={1}/><stop offset="100%" stopColor="#f97316" stopOpacity={1}/></linearGradient></defs></BarChart></ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-orange-200 rounded-3xl bg-orange-50/50"><span className="text-5xl mb-3">📉</span><p className="text-orange-400 font-bold text-xl">ยังไม่มีข้อมูลสถิติ</p></div>
              )}
            </div>
          </div>

          {/* รายชื่อสมาชิก */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-white mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3"><span className="bg-sky-100 text-sky-600 p-2.5 rounded-xl">👥</span> ฐานข้อมูลสมาชิก</h2>
              <button onClick={handleOpenAdd} className="bg-gradient-to-r from-sky-400 to-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-md transition-all">+ เพิ่มสมาชิกใหม่</button>
            </div>
            <div className="overflow-auto max-h-[500px] pr-2 space-y-6">
              {sortedCells.map(cellName => (
                <div key={cellName} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 border-b border-gray-100 p-4 flex justify-between items-center"><h3 className="font-black text-slate-700 text-lg">❖ กลุ่ม: {cellName}</h3><span className="bg-white text-sky-600 text-sm font-bold px-4 py-1.5 rounded-full border border-sky-100">{groupedMembers[cellName].length} คน</span></div>
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="bg-white text-gray-400 text-xs uppercase tracking-wider">
                      <tr><th className="p-4 font-bold">ชื่อ-สกุล (ชื่อเล่น)</th><th className="p-4 font-bold">เบอร์โทร</th><th className="p-4 font-bold text-center">อายุ/เพศ</th><th className="p-4 font-bold">สถานะ</th><th className="p-4 font-bold text-center">จัดการ</th></tr>
                    </thead>
                    <tbody className="bg-white">
                      {groupedMembers[cellName].map((m, i) => (
                        <tr key={m.id || i} className="border-b border-gray-50 hover:bg-slate-50 transition-colors"><td className="p-4 font-bold text-gray-700">{m['ชื่อ-สกุล']} {m['ชื่อเล่น'] ? `(${m['ชื่อเล่น']})` : ''}</td><td className="p-4 text-gray-500 text-sm">{m['เบอร์โทร'] || '-'}</td><td className="p-4 text-gray-500 text-center text-sm">{m['อายุ'] ? `${m['อายุ']} ปี` : '-'}</td><td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-black ${cellLeaderRoles.includes(m['สถานะ']) ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{m['สถานะ'] || 'สมาชิก'}</span></td><td className="p-4 text-center"><button onClick={() => handleOpenEdit(m)} className="text-gray-400 hover:text-sky-600 px-4 py-2 rounded-xl text-sm font-bold">แก้ไข</button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal ต่างๆ */}
        {isAttModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8">
              <h2 className="text-2xl font-black text-gray-800 mb-6">กรอกสถิติสัปดาห์นี้</h2>
              <form onSubmit={handleSaveAttendance} className="space-y-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">วันที่ (วันอาทิตย์)</label><input type="date" required value={attForm.date} onChange={e => setAttForm({...attForm, date: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">จำนวนคนมาร่วม (คน)</label><input type="number" required min="0" value={attForm.count} onChange={e => setAttForm({...attForm, count: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none text-orange-600 font-black text-lg" /></div>
                <div className="flex justify-end gap-4"><button type="button" onClick={() => setIsAttModalOpen(false)} className="px-6 py-3 rounded-2xl font-bold bg-gray-50">ยกเลิก</button><button type="submit" className="px-8 py-3 rounded-2xl font-black text-white bg-orange-500">บันทึก</button></div>
              </form>
            </div>
          </div>
        )}

      </div>
    )
  }

  return null
}