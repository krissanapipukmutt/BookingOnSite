import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import './App.css'

const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const SUPABASE_ENV_HINT = 'กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ในไฟล์ .env หรือ .env.local ก่อนใช้งาน'

const pad = (value) => String(value).padStart(2, '0')
const today = new Date()
const TODAY = today.toISOString().slice(0, 10)
const CURRENT_MONTH = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`

const toDateString = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const getMonthRange = (monthValue) => {
  const [year, month] = String(monthValue ?? '').split('-').map(Number)
  if (!year || !month) {
    const fallback = new Date()
    return {
      start: new Date(fallback.getFullYear(), fallback.getMonth(), 1),
      end: new Date(fallback.getFullYear(), fallback.getMonth() + 1, 1),
    }
  }
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  }
}

const shiftMonth = (monthValue, delta) => {
  const [year, month] = String(monthValue ?? '').split('-').map(Number)
  const base = year && month ? new Date(year, month - 1, 1) : new Date()
  const moved = new Date(base.getFullYear(), base.getMonth() + delta, 1)
  return `${moved.getFullYear()}-${pad(moved.getMonth() + 1)}`
}

const formatMonthLabel = (monthValue) => {
  const [year, month] = String(monthValue ?? '').split('-').map(Number)
  if (!year || !month) return monthValue ?? ''
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('th-TH-u-ca-gregory', { month: 'long', year: 'numeric' })
}

const getYearGridStart = (year) => {
  const targetYear = Number.isFinite(year) ? year : today.getFullYear()
  const clampedYear = Math.min(Math.max(targetYear, CALENDAR_YEAR_START), CALENDAR_YEAR_END)
  const offset = clampedYear - CALENDAR_YEAR_START
  return CALENDAR_YEAR_START + Math.floor(offset / YEAR_GRID_SIZE) * YEAR_GRID_SIZE
}

const DEFAULT_STRATEGIES = [
  { code: 'UNLIMITED', display_name: 'Unlimited', description: 'Departments with no capacity limit' },
  { code: 'CAPACITY', display_name: 'Capacity Limited', description: 'Departments with numeric daily capacity' },
  { code: 'ASSIGNED', display_name: 'Seat Assigned', description: 'Departments requiring specific seats' },
]

const CALENDAR_PREVIEW_LIMIT = 3
const YEAR_GRID_SIZE = 12
const CALENDAR_YEAR_START = 2000
const CALENDAR_YEAR_END = 2050
const MONTH_OPTIONS = [
  { value: '01', label: 'ม.ค.' },
  { value: '02', label: 'ก.พ.' },
  { value: '03', label: 'มี.ค.' },
  { value: '04', label: 'เม.ย.' },
  { value: '05', label: 'พ.ค.' },
  { value: '06', label: 'มิ.ย.' },
  { value: '07', label: 'ก.ค.' },
  { value: '08', label: 'ส.ค.' },
  { value: '09', label: 'ก.ย.' },
  { value: '10', label: 'ต.ค.' },
  { value: '11', label: 'พ.ย.' },
  { value: '12', label: 'ธ.ค.' },
]

const SAMPLE_DATA = {
  department_booking_strategies: DEFAULT_STRATEGIES.map((strategy) => ({ ...strategy })),
  offices: [
    { id: 'office-1', name: 'Bangkok HQ' },
    { id: 'office-2', name: 'Remote Hub' },
  ],
  departments: [
    { id: 'dept-1', name: 'Engineering', office_id: 'office-1', booking_strategy: 'ASSIGNED', seat_capacity: null, is_active: true },
    { id: 'dept-2', name: 'HR', office_id: 'office-1', booking_strategy: 'UNLIMITED', seat_capacity: null, is_active: true },
    { id: 'dept-3', name: 'Support', office_id: 'office-1', booking_strategy: 'CAPACITY', seat_capacity: 20, is_active: true },
    { id: 'dept-4', name: 'Sales', office_id: 'office-2', booking_strategy: 'CAPACITY', seat_capacity: 15, is_active: true },
  ],
  department_seats: [
    { id: 'seat-1', seat_code: 'ENG-01', department_id: 'dept-1' },
    { id: 'seat-2', seat_code: 'ENG-02', department_id: 'dept-1' },
    { id: 'seat-3', seat_code: 'SALE-01', department_id: 'dept-4' },
    { id: 'seat-4', seat_code: 'SALE-02', department_id: 'dept-4' },
  ],
  booking_purposes: [
    { id: 'purpose-1', name: 'Team Sync-Up' },
    { id: 'purpose-2', name: 'Client Meeting' },
    { id: 'purpose-3', name: 'Training Session' },
  ],
  employee_profiles: [
    {
      user_id: 'user-1',
      employee_code: 'EMP001',
      first_name: 'Arthit',
      last_name: 'Prasert',
      email: 'arthit@example.com',
      department_id: 'dept-1',
      start_date: `${today.getFullYear()}-01-02`,
      is_active: true,
    },
    {
      user_id: 'user-2',
      employee_code: 'EMP002',
      first_name: 'Warin',
      last_name: 'Somsri',
      email: 'warin@example.com',
      department_id: 'dept-3',
      start_date: `${today.getFullYear()}-02-10`,
      is_active: true,
    },
    {
      user_id: 'user-3',
      employee_code: 'EMP003',
      first_name: 'Nicha',
      last_name: 'Rattanakorn',
      email: 'nicha@example.com',
      department_id: 'dept-2',
      start_date: `${today.getFullYear()}-03-05`,
      is_active: true,
    },
    {
      user_id: 'user-4',
      employee_code: 'EMP004',
      first_name: 'Phuwan',
      last_name: 'Chantarangkul',
      email: 'phuwan@example.com',
      department_id: 'dept-4',
      start_date: `${today.getFullYear()}-04-18`,
      is_active: true,
    },
  ],
  employee_booking_history: [
    {
      booking_id: 'b1',
      booking_date: TODAY,
      department_name: 'Engineering',
      office_name: 'Bangkok HQ',
      status: 'BOOKED',
      purpose_name: 'Team Sync-Up',
      seat_code: 'ENG-01',
      employee_code: 'EMP001',
      employee_name: 'Arthit Prasert',
    },
    {
      booking_id: 'b2',
      booking_date: TODAY,
      department_name: 'Support',
      office_name: 'Bangkok HQ',
      status: 'BOOKED',
      purpose_name: 'Client Meeting',
      seat_code: null,
      employee_code: 'EMP002',
      employee_name: 'Warin Somsri',
    },
  ],
  booking_status_daily_summary: [
    { booking_date: TODAY, purpose_name: 'Team Sync-Up', status: 'BOOKED', total: 12 },
    { booking_date: TODAY, purpose_name: 'Client Meeting', status: 'BOOKED', total: 7 },
    { booking_date: TODAY, purpose_name: 'Training Session', status: 'CANCELLED', total: 1 },
  ],
  department_daily_capacity_usage: [
    {
      booking_date: TODAY,
      department_name: 'Support',
      office_name: 'Bangkok HQ',
      active_bookings: 18,
      seat_capacity: 20,
      remaining_capacity: 2,
    },
    {
      booking_date: TODAY,
      department_name: 'Engineering',
      office_name: 'Bangkok HQ',
      active_bookings: 10,
      seat_capacity: null,
      remaining_capacity: null,
    },
  ],
  department_monthly_attendance: [
    {
      department_id: 'dept-1',
      department_name: 'Engineering',
      office_name: 'Bangkok HQ',
      month_start: `${CURRENT_MONTH}-01`,
      total_bookings: 42,
    },
    {
      department_id: 'dept-2',
      department_name: 'HR',
      office_name: 'Bangkok HQ',
      month_start: `${CURRENT_MONTH}-01`,
      total_bookings: 25,
    },
  ],
  employee_yearly_attendance: [
    {
      user_id: 'u1',
      employee_code: 'EMP001',
      first_name: 'Arthit',
      last_name: 'Prasert',
      year: today.getFullYear(),
      total_booked_days: 56,
    },
    {
      user_id: 'u2',
      employee_code: 'EMP002',
      first_name: 'Warin',
      last_name: 'Somsri',
      year: today.getFullYear(),
      total_booked_days: 48,
    },
  ],
  office_holiday_overview: [
    {
      holiday_date: TODAY,
      office_name: 'All Offices',
      holiday_name: 'วันปีใหม่',
      description: 'บริษัทปิดทำการ',
    },
    {
      holiday_date: `${today.getFullYear()}-04-13`,
      office_name: 'Bangkok HQ',
      holiday_name: 'สงกรานต์',
      description: 'เฉพาะสำนักงานใหญ่',
    },
  ],
}

const NAV_LINKS = [
  { to: '/booking', label: 'จองเข้าออฟฟิศ' },
  { to: '/holidays', label: 'วันหยุดประจำปี' },
  { to: '/departments', label: 'จัดการฝ่ายงาน' },
  { to: '/employees', label: 'จัดการพนักงาน' },
  { to: '/reports', label: 'รายงาน / ประวัติ' },
]

function App() {
  const [offices, setOffices] = useState([])
  const [departments, setDepartments] = useState([])
  const [seats, setSeats] = useState([])
  const [purposes, setPurposes] = useState([])
  const [employees, setEmployees] = useState([])
  const [strategies, setStrategies] = useState([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  const [bookingMode, setBookingMode] = useState('range')
  const [bookingStartDate, setBookingStartDate] = useState(TODAY)
  const [bookingEndDate, setBookingEndDate] = useState(TODAY)
  const [multiDateInput, setMultiDateInput] = useState(TODAY)
  const [multiDates, setMultiDates] = useState([])
  const [selectedOffice, setSelectedOffice] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedSeat, setSelectedSeat] = useState('')
  const [selectedPurpose, setSelectedPurpose] = useState('')
  const [note, setNote] = useState('')
  const [monthFilter, setMonthFilter] = useState(CURRENT_MONTH)
  const [calendarMonth, setCalendarMonth] = useState(CURRENT_MONTH)

  const [calendarState, setCalendarState] = useState({ loading: true, rows: [] })
  const [holidayState, setHolidayState] = useState({ loading: true, rows: [] })
  const [dailyStatus, setDailyStatus] = useState({ loading: true, rows: [] })
  const [capacityReport, setCapacityReport] = useState({ loading: true, rows: [] })
  const [deptMonthly, setDeptMonthly] = useState({ loading: true, rows: [] })
  const [employeeYearly, setEmployeeYearly] = useState({ loading: true, rows: [] })
  const [historyReport, setHistoryReport] = useState({ loading: true, rows: [] })
  const [holidayReport, setHolidayReport] = useState({ loading: true, rows: [] })

  // Booking editor modal state
  const [editBookingState, setEditBookingState] = useState({ open: false, loading: false, id: null, form: null })

  const supabase = useMemo(() => {
    if (!ENV_SUPABASE_URL || !ENV_SUPABASE_ANON_KEY) return null
    try {
      return createClient(ENV_SUPABASE_URL, ENV_SUPABASE_ANON_KEY, {
        db: { schema: 'boksite' },
        global: {
          headers: {
            apikey: ENV_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${ENV_SUPABASE_ANON_KEY}`,
          },
        },
      })
    } catch (error) {
      console.error('Failed to initialise Supabase client', error)
      return null
    }
  }, [])

  const supabaseConfigured = Boolean(supabase)

  const fetchTable = useCallback(
    async (table, orderColumn = 'name') => {
      if (!supabase) {
        const sample = SAMPLE_DATA[table]
        return sample ? [...sample] : []
      }
      const { data, error } = await supabase.from(table).select('*').order(orderColumn, { ascending: true })
      if (error) {
        console.error(`Supabase table query failed for ${table}`, error)
        throw error
      }
      return data ?? []
    },
    [supabase],
  )

  const fetchView = useCallback(
    async (viewName, { limit } = {}) => {
      if (!supabase) {
        const sample = SAMPLE_DATA[viewName] ?? []
        return limit ? sample.slice(0, limit) : [...sample]
      }
      let query = supabase.from(viewName).select('*')
      if (limit) query = query.limit(limit)
      const { data, error } = await query
      if (error) {
        console.error(`Supabase view query failed for ${viewName}`, error)
        throw error
      }
      return data ?? []
    },
    [supabase],
  )

  useEffect(() => {
    let ignore = false
    async function loadLookups() {
      try {
        const [officeData, departmentData, seatData, purposeData, employeeData, strategyData] = await Promise.all([
          fetchTable('offices'),
          fetchTable('departments'),
          fetchTable('department_seats', 'seat_code'),
          fetchTable('booking_purposes'),
          fetchTable('employee_profiles', 'employee_code'),
          fetchTable('department_booking_strategies', 'code'),
        ])
        if (!ignore) {
          setOffices(officeData)
          setDepartments(departmentData)
          setSeats(seatData)
          setPurposes(purposeData)
          setEmployees(employeeData)
          setStrategies(strategyData.length ? strategyData : DEFAULT_STRATEGIES.map((item) => ({ ...item })))
        }
      } catch (error) {
        // already logged
      }
    }
    loadLookups()
    return () => {
      ignore = true
    }
  }, [fetchTable])

  const reloadCalendar = useCallback(async () => {
    setCalendarState({ loading: true, rows: [] })
    try {
      const { start, end } = getMonthRange(calendarMonth)
      const startDate = toDateString(start)
      const endDate = toDateString(end)
      if (!supabase) {
        const rows = await fetchView('employee_booking_history')
        const filtered = rows.filter(
          (row) => row.booking_date && row.booking_date >= startDate && row.booking_date < endDate,
        )
        setCalendarState({ loading: false, rows: filtered })
        return
      }
      const { data, error } = await supabase
        .from('employee_booking_history')
        .select('*')
        .order('booking_date', { ascending: true })
      if (error) throw error
      const filtered = (data ?? []).filter((row) => {
        const dateKey = row.booking_date?.slice(0, 10)
        return dateKey && dateKey >= startDate && dateKey < endDate
      })
      setCalendarState({ loading: false, rows: filtered })
    } catch (error) {
      setCalendarState({ loading: false, rows: [] })
    }
  }, [calendarMonth, fetchView, supabase])

  const reloadHolidayOverview = useCallback(async () => {
    setHolidayState({ loading: true, rows: [] })
    setHolidayReport({ loading: true, rows: [] })
    try {
      if (!supabase) {
        const rows = await fetchView('office_holiday_overview')
        const normalized = rows.map((row, index) => ({
          ...row,
          id: row.id ?? `sample-holiday-${index}`,
          office_id: row.office_id ?? null,
        }))
        setHolidayState({ loading: false, rows: normalized })
        setHolidayReport({ loading: false, rows: normalized })
        return
      }
      const { data, error } = await supabase
        .from('company_holidays')
        .select('id, holiday_date, name, description, office_id')
        .order('holiday_date', { ascending: true })
        .order('office_id', { ascending: true })
      if (error) throw error
      const officeLookup = new Map(offices.map((office) => [office.id, office.name]))
      const rows = (data ?? []).map((item) => ({
        id: item.id,
        holiday_date: item.holiday_date,
        holiday_name: item.name,
        office_id: item.office_id,
        office_name: item.office_id ? officeLookup.get(item.office_id) ?? '-' : 'All Offices',
        description: item.description,
      }))
      setHolidayState({ loading: false, rows })
      setHolidayReport({ loading: false, rows })
    } catch (error) {
      setHolidayState({ loading: false, rows: [] })
      setHolidayReport({ loading: false, rows: [] })
    }
  }, [fetchView, offices, supabase])

  const reloadDailyStatus = useCallback(async () => {
    setDailyStatus({ loading: true, rows: [] })
    try {
      const rows = await fetchView('booking_status_daily_summary')
      setDailyStatus({ loading: false, rows })
    } catch (error) {
      setDailyStatus({ loading: false, rows: [] })
    }
  }, [fetchView])

  const reloadCapacity = useCallback(async () => {
    setCapacityReport({ loading: true, rows: [] })
    try {
      const rows = await fetchView('department_daily_capacity_usage')
      setCapacityReport({ loading: false, rows })
    } catch (error) {
      setCapacityReport({ loading: false, rows: [] })
    }
  }, [fetchView])

  const reloadDeptMonthly = useCallback(
    async (targetMonth = '') => {
      setDeptMonthly({ loading: true, rows: [] })
      try {
        const rows = await fetchView('department_monthly_attendance')
        const filtered = targetMonth ? rows.filter((row) => row.month_start?.startsWith(targetMonth)) : rows
        setDeptMonthly({ loading: false, rows: filtered })
      } catch (error) {
        setDeptMonthly({ loading: false, rows: [] })
      }
    },
    [fetchView],
  )

  const reloadEmployeeYearly = useCallback(async () => {
    setEmployeeYearly({ loading: true, rows: [] })
    try {
      const rows = await fetchView('employee_yearly_attendance')
      setEmployeeYearly({ loading: false, rows })
    } catch (error) {
      setEmployeeYearly({ loading: false, rows: [] })
    }
  }, [fetchView])

  const reloadHistory = useCallback(async () => {
    setHistoryReport({ loading: true, rows: [] })
    try {
      const rows = await fetchView('employee_booking_history', { limit: 20 })
      setHistoryReport({ loading: false, rows })
    } catch (error) {
      setHistoryReport({ loading: false, rows: [] })
    }
  }, [fetchView])

  const openBookingEditor = useCallback(
    async (bookingId) => {
      setEditBookingState({ open: true, loading: true, id: bookingId, form: null })
      try {
        if (!supabase) {
          // Fallback to data in calendar view for display only
          const row = calendarState.rows.find((r) => r.booking_id === bookingId)
          setEditBookingState({
            open: true,
            loading: false,
            id: bookingId,
            form: row
              ? {
                  booking_date: row.booking_date,
                  department_id: departments.find((d) => d.name === row.department_name)?.id ?? '',
                  purpose_id: purposes.find((p) => p.name === row.purpose_name)?.id ?? '',
                  seat_id: seats.find((s) => s.seat_code === row.seat_code)?.id ?? '',
                  note: '',
                  status: row.status ?? 'BOOKED',
                  user_id: null,
                }
              : null,
          })
          return
        }
        const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single()
        if (error) throw error
        setEditBookingState({ open: true, loading: false, id: bookingId, form: data })
      } catch (error) {
        console.error('Failed to load booking', error)
        setEditBookingState({ open: true, loading: false, id: bookingId, form: null })
        alert(error.message || 'ไม่สามารถโหลดข้อมูลการจองได้')
      }
    },
    [supabase, calendarState.rows, departments, purposes, seats]
  )

  const closeBookingEditor = useCallback(() => setEditBookingState({ open: false, loading: false, id: null, form: null }), [])

  const handleBookingEditChange = useCallback((patch) => {
    setEditBookingState((prev) => ({ ...prev, form: { ...(prev.form ?? {}), ...patch } }))
  }, [])

  const saveBookingEdit = useCallback(async () => {
    if (!supabaseConfigured || !supabase) {
      alert(SUPABASE_ENV_HINT)
      return
    }
    const f = editBookingState.form ?? {}
    const bookingId = f.id ?? editBookingState.id
    if (!bookingId) {
      alert('ไม่พบรหัสการจองสำหรับการอัปเดต')
      return
    }
    const payload = {
      booking_date: f.booking_date,
      department_id: f.department_id || null,
      seat_id: f.seat_id || null,
      purpose_id: f.purpose_id || null,
      note: f.note || null,
      status: f.status || 'BOOKED',
      user_id: f.user_id || null,
    }
    try {
      const { data, error } = await supabase.from('bookings').update(payload).eq('id', bookingId).select('id')
      if (error) throw error
      if (!data?.length) {
        alert('ไม่พบรายการจองที่ต้องการอัปเดต (ตรวจสอบสิทธิ์ RLS ของตาราง bookings)')
        return
      }
      alert('อัปเดตการจองเรียบร้อยแล้ว')
      closeBookingEditor()
      await Promise.all([reloadCalendar(), reloadHistory(), reloadDailyStatus(), reloadCapacity()])
    } catch (error) {
      console.error(error)
      alert(error.message || 'ไม่สามารถอัปเดตการจองได้')
    }
  }, [supabaseConfigured, supabase, editBookingState.id, editBookingState.form, closeBookingEditor, reloadCalendar, reloadHistory, reloadDailyStatus, reloadCapacity])

  const reloadDepartments = useCallback(async () => {
    try {
      const rows = await fetchTable('departments')
      setDepartments(rows)
      return true
    } catch (error) {
      console.error('Failed to reload departments', error)
      return false
    }
  }, [fetchTable])

  const reloadEmployees = useCallback(async () => {
    try {
      const rows = await fetchTable('employee_profiles', 'employee_code')
      setEmployees(rows)
      return true
    } catch (error) {
      console.error('Failed to reload employees', error)
      return false
    }
  }, [fetchTable])

  useEffect(() => {
    reloadCalendar()
    reloadHolidayOverview()
    reloadDailyStatus()
    reloadCapacity()
    reloadDeptMonthly(monthFilter)
    reloadEmployeeYearly()
    reloadHistory()
  }, [
    reloadCalendar,
    reloadHolidayOverview,
    reloadDailyStatus,
    reloadCapacity,
    reloadDeptMonthly,
    reloadEmployeeYearly,
    reloadHistory,
    monthFilter,
  ])

  const filteredDepartments = useMemo(() => {
    if (!selectedOffice) return departments
    return departments.filter((dept) => dept.office_id === selectedOffice)
  }, [departments, selectedOffice])

  const activeDepartment = useMemo(() => {
    return departments.find((dept) => dept.id === selectedDepartment) ?? null
  }, [departments, selectedDepartment])

  const filteredSeats = useMemo(() => {
    if (!selectedDepartment) return []
    return seats.filter((seat) => seat.department_id === selectedDepartment)
  }, [seats, selectedDepartment])

  // Employees eligible based on chosen department/office
  const eligibleEmployees = useMemo(() => {
    // If department chosen, restrict to that department only
    if (selectedDepartment) {
      return employees.filter((emp) => emp.department_id === selectedDepartment)
    }
    // If office chosen (but no department), restrict to employees in any dept of that office
    if (selectedOffice) {
      const deptIds = new Set(
        departments.filter((d) => d.office_id === selectedOffice).map((d) => d.id),
      )
      return employees.filter((emp) => emp.department_id && deptIds.has(emp.department_id))
    }
    // No filter when nothing selected
    return employees
  }, [employees, departments, selectedDepartment, selectedOffice])

  const seatRequired = activeDepartment?.booking_strategy === 'ASSIGNED'

  useEffect(() => {
    if (!seatRequired) {
      setSelectedSeat('')
    }
  }, [seatRequired])

  const handleOfficeChange = (event) => {
    const value = event.target.value
    setSelectedOffice(value)
    setSelectedDepartment('')
    setSelectedSeat('')
    setSelectedEmployee(null)
    setEmployeeSearch('')
  }

  const handleDepartmentChange = (event) => {
    const value = event.target.value
    setSelectedDepartment(value)
    setSelectedSeat('')
    if (selectedEmployee && selectedEmployee.department_id !== value) {
      setSelectedEmployee(null)
      setEmployeeSearch('')
    }
    const dept = departments.find((d) => d.id === value)
    if (dept) {
      setSelectedOffice(dept.office_id)
    }
  }

  useEffect(() => {
    if (selectedEmployee) {
      setSelectedDepartment(selectedEmployee.department_id)
      const dept = departments.find((d) => d.id === selectedEmployee.department_id)
      if (dept) {
        setSelectedOffice(dept.office_id)
      }
    }
  }, [selectedEmployee, departments])

  useEffect(() => {
    if (selectedEmployee) {
      setEmployeeSearch(formatEmployeeOption(selectedEmployee))
    }
  }, [selectedEmployee])

  const handleEmployeeSearchChange = (event) => {
    const value = event.target.value
    setEmployeeSearch(value)
    if (!value) {
      setSelectedEmployee(null)
      return
    }
    const lower = value.toLowerCase()
    // Match within eligible list only
    const exact = eligibleEmployees.find((emp) => formatEmployeeOption(emp).toLowerCase() === lower)
    const codeMatch = eligibleEmployees.find((emp) => (emp.employee_code ?? '').toLowerCase() === lower)
    let match = exact ?? codeMatch
    if (!match) {
      const partialMatches = eligibleEmployees.filter((emp) => {
        const name = `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.toLowerCase()
        return (
          (emp.employee_code ?? '').toLowerCase().startsWith(lower) ||
          name.includes(lower)
        )
      })
      if (partialMatches.length === 1) {
        match = partialMatches[0]
      }
    }
    if (match) {
      setSelectedEmployee(match)
    }
  }

  const handleBookingModeChange = useCallback(
    (mode) => {
      setBookingMode(mode)
      if (mode === 'range') {
        if (!bookingStartDate) setBookingStartDate(TODAY)
        if (!bookingEndDate) setBookingEndDate(TODAY)
      } else {
        if (!multiDateInput) setMultiDateInput(TODAY)
      }
    },
    [bookingStartDate, bookingEndDate, multiDateInput],
  )

  const handleAddMultiDate = useCallback(() => {
    if (!multiDateInput) {
      alert('กรุณาเลือกวันที่ก่อนกดเพิ่ม')
      return
    }
    const candidate = multiDateInput
    const parsed = new Date(`${candidate}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) {
      alert('วันที่ไม่ถูกต้อง')
      return
    }
    if (multiDates.includes(candidate)) {
      alert('เลือกวันดังกล่าวไว้แล้ว')
      return
    }
    const next = [...multiDates, candidate].sort()
    setMultiDates(next)
    setMultiDateInput('')
  }, [multiDateInput, multiDates])

  const handleRemoveMultiDate = useCallback((target) => {
    setMultiDates((prev) => prev.filter((date) => date !== target))
  }, [])

  const handleBookingSubmit = async (event) => {
    event.preventDefault()
    if (!selectedEmployee) {
      alert('กรุณาเลือกพนักงาน')
      return
    }
    if (!supabaseConfigured) {
      alert(SUPABASE_ENV_HINT)
      return
    }

    let bookingDates = []
    if (bookingMode === 'range') {
      const start = bookingStartDate ? new Date(`${bookingStartDate}T00:00:00Z`) : null
      const end = bookingEndDate ? new Date(`${bookingEndDate}T00:00:00Z`) : null
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        alert('กรุณาเลือกวันที่ให้ถูกต้อง')
        return
      }
      if (end < start) {
        alert('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น')
        return
      }
      const dayMs = 24 * 60 * 60 * 1000
      for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + dayMs)) {
        bookingDates.push(cursor.toISOString().slice(0, 10))
      }
    } else {
      if (!multiDates.length) {
        alert('กรุณาเพิ่มวันที่ที่ต้องการจองอย่างน้อย 1 วัน')
        return
      }
      bookingDates = [...new Set(multiDates)].sort()
    }

    try {
      const userId = selectedEmployee.user_id
      const rows = bookingDates.map((booking_date) => ({
        booking_date,
        department_id: selectedDepartment,
        seat_id: selectedSeat || null,
        purpose_id: selectedPurpose || null,
        note: note || null,
        user_id: userId,
      }))
      const { error } = await supabase.from('bookings').insert(rows)
      if (error) throw error
      alert('บันทึกการจองเรียบร้อยแล้ว')
      setSelectedPurpose('')
      setNote('')
      setBookingStartDate(TODAY)
      setBookingEndDate(TODAY)
      setMultiDates([])
      setMultiDateInput(TODAY)
      await Promise.all([reloadCalendar(), reloadHistory(), reloadDailyStatus(), reloadCapacity()])
    } catch (error) {
      console.error(error)
      alert(error.message || 'ไม่สามารถบันทึกการจองได้')
    }
  }

  const handleBookingReset = () => {
    setBookingMode('range')
    setSelectedOffice('')
    setSelectedDepartment('')
    setSelectedSeat('')
    setSelectedPurpose('')
    setNote('')
    setBookingStartDate(TODAY)
    setBookingEndDate(TODAY)
    setMultiDates([])
    setMultiDateInput(TODAY)
    setSelectedEmployee(null)
    setEmployeeSearch('')
  }

  const createHoliday = useCallback(
    async (payload) => {
      if (!supabaseConfigured || !supabase) {
        alert(SUPABASE_ENV_HINT)
        return false
      }
      try {
        const { error } = await supabase.from('company_holidays').insert(payload)
        if (error) throw error
        alert('เพิ่มวันหยุดเรียบร้อยแล้ว')
        await reloadHolidayOverview()
        return true
      } catch (error) {
        console.error(error)
        alert(error.message || 'ไม่สามารถเพิ่มวันหยุดได้')
        return false
      }
    },
    [supabaseConfigured, supabase, reloadHolidayOverview],
  )

  const updateHoliday = useCallback(
    async (holidayId, payload) => {
      if (!supabaseConfigured || !supabase) {
        alert(SUPABASE_ENV_HINT)
        return false
      }
      try {
        const { error } = await supabase.from('company_holidays').update(payload).eq('id', holidayId)
        if (error) throw error
        alert('อัปเดตวันหยุดเรียบร้อยแล้ว')
        await reloadHolidayOverview()
        return true
      } catch (error) {
        console.error(error)
        alert(error.message || 'ไม่สามารถอัปเดตวันหยุดได้')
        return false
      }
    },
    [supabaseConfigured, supabase, reloadHolidayOverview],
  )

  const deleteHoliday = useCallback(
    async (holidayId) => {
      if (!supabaseConfigured || !supabase) {
        alert(SUPABASE_ENV_HINT)
        return false
      }
      try {
        const { error } = await supabase.from('company_holidays').delete().eq('id', holidayId)
        if (error) throw error
        alert('ลบวันหยุดเรียบร้อยแล้ว')
        await reloadHolidayOverview()
        return true
      } catch (error) {
        console.error(error)
        alert(error.message || 'ไม่สามารถลบวันหยุดได้')
        return false
      }
    },
    [supabaseConfigured, supabase, reloadHolidayOverview],
  )

  const bookingDisabled =
    !selectedEmployee ||
    !selectedDepartment ||
    (seatRequired && !selectedSeat) ||
    (bookingMode === 'range' && (!bookingStartDate || !bookingEndDate)) ||
    (bookingMode === 'multi' && multiDates.length === 0)

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <h1>Booking Onsite</h1>
            <p>ระบบจองที่นั่งเข้าออฟฟิศ (Supabase)</p>
          </div>
        </header>

        <nav className="tab-nav" role="navigation" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {!supabaseConfigured && (
          <section className="banner">
            <p>
              ไม่พบการตั้งค่า Supabase ในไฟล์ .env.local ระบบจะแสดงข้อมูลตัวอย่างเท่านั้น และไม่สามารถบันทึกข้อมูลจริง
            </p>
          </section>
        )}

        <main>
          <Routes>
            <Route
              path="/booking"
              element={
                <BookingPage
                  employees={eligibleEmployees}
                  employeeSearch={employeeSearch}
                  onEmployeeSearchChange={handleEmployeeSearchChange}
                  selectedEmployee={selectedEmployee}
                  bookingMode={bookingMode}
                  onBookingModeChange={handleBookingModeChange}
                  bookingStartDate={bookingStartDate}
                  bookingEndDate={bookingEndDate}
                  setBookingStartDate={setBookingStartDate}
                  setBookingEndDate={setBookingEndDate}
                  multiDates={multiDates}
                  multiDateInput={multiDateInput}
                  setMultiDateInput={setMultiDateInput}
                  onAddMultiDate={handleAddMultiDate}
                  onRemoveMultiDate={handleRemoveMultiDate}
                  offices={offices}
                  selectedOffice={selectedOffice}
                  onOfficeChange={handleOfficeChange}
                  departments={filteredDepartments}
                  selectedDepartment={selectedDepartment}
                  onDepartmentChange={handleDepartmentChange}
                  seatRequired={seatRequired}
                  seats={filteredSeats}
                  selectedSeat={selectedSeat}
                  setSelectedSeat={setSelectedSeat}
                  selectedPurpose={selectedPurpose}
                  setSelectedPurpose={setSelectedPurpose}
                  purposes={purposes}
                  note={note}
                  setNote={setNote}
                  onSubmit={handleBookingSubmit}
                  onReset={handleBookingReset}
                  calendarState={calendarState}
                  calendarMonth={calendarMonth}
                  onCalendarMonthChange={setCalendarMonth}
                  bookingDisabled={bookingDisabled}
                  onOpenBooking={openBookingEditor}
                />
              }
            />
            <Route
              path="/holidays"
              element={
                <HolidayPage
                  offices={offices}
                  holidayState={holidayState}
                  onCreate={createHoliday}
                  onUpdate={updateHoliday}
                  onDelete={deleteHoliday}
                  supabaseConfigured={supabaseConfigured}
                />
              }
            />
            <Route
              path="/departments"
              element={
                <DepartmentMasterPage
                  supabase={supabase}
                  supabaseConfigured={supabaseConfigured}
                  departments={departments}
                  offices={offices}
                  strategies={strategies}
                  reloadDepartments={reloadDepartments}
                />
              }
            />
            <Route
              path="/employees"
              element={
                <EmployeeMasterPage
                  supabase={supabase}
                  supabaseConfigured={supabaseConfigured}
                  employees={employees}
                  departments={departments}
                  reloadEmployees={reloadEmployees}
                />
              }
            />
            <Route
              path="/reports"
              element={
                <ReportsPage
                  dailyStatus={dailyStatus}
                  reloadDailyStatus={reloadDailyStatus}
                  capacityReport={capacityReport}
                  reloadCapacity={reloadCapacity}
                  deptMonthly={deptMonthly}
                  reloadDeptMonthly={reloadDeptMonthly}
                  monthFilter={monthFilter}
                  setMonthFilter={setMonthFilter}
                  employeeYearly={employeeYearly}
                  reloadEmployeeYearly={reloadEmployeeYearly}
                  historyReport={historyReport}
                  reloadHistory={reloadHistory}
                  holidayReport={holidayReport}
                  reloadHolidayOverview={reloadHolidayOverview}
                />
              }
            />
            <Route path="/" element={<Navigate to="/booking" replace />} />
            <Route path="*" element={<Navigate to="/booking" replace />} />
          </Routes>
        </main>
      </div>
      {editBookingState.open && (
        <BookingEditModal
          loading={editBookingState.loading}
          form={editBookingState.form}
          onChange={handleBookingEditChange}
          onClose={closeBookingEditor}
          onSave={saveBookingEdit}
          departments={departments}
          purposes={purposes}
          seats={seats}
          strategies={strategies}
          employees={employees}
        />
      )}
    </BrowserRouter>
  )
}

function MonthYearPicker({ value, onChange }) {
  const pickerRef = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerView, setPickerView] = useState('month')

  const [calendarYearValue, calendarMonthValue] = useMemo(() => {
    const [year, month] = String(value ?? '').split('-')
    const yearNumber = Number(year)
    const monthNumber = Number(month)
    const safeYear = Number.isFinite(yearNumber) && yearNumber > 0 ? yearNumber : today.getFullYear()
    const safeMonth =
      Number.isFinite(monthNumber) && monthNumber >= 1 && monthNumber <= 12 ? pad(monthNumber) : pad(today.getMonth() + 1)
    return [String(safeYear), safeMonth]
  }, [value])

  const [yearGridStart, setYearGridStart] = useState(() => getYearGridStart(Number(calendarYearValue)))
  const yearGridMaxStart = Math.max(CALENDAR_YEAR_START, CALENDAR_YEAR_END - YEAR_GRID_SIZE + 1)
  const yearGridLabelEnd = Math.min(yearGridStart + YEAR_GRID_SIZE - 1, CALENDAR_YEAR_END)
  const yearGridYears = useMemo(() => {
    const years = []
    for (let year = yearGridStart; year <= yearGridLabelEnd; year += 1) {
      years.push(year)
    }
    return years
  }, [yearGridStart, yearGridLabelEnd])

  const calendarLabel = formatMonthLabel(`${calendarYearValue}-${calendarMonthValue}`)

  const handlePickCurrentMonth = useCallback(() => {
    const now = new Date()
    const next = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
    onChange?.(next)
    setPickerView('month')
    setPickerOpen(false)
  }, [onChange])

  useEffect(() => {
    if (!pickerOpen) return
    setYearGridStart(getYearGridStart(Number(calendarYearValue)))
  }, [pickerOpen, calendarYearValue])

  useEffect(() => {
    if (!pickerOpen) return
    const handleClick = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setPickerOpen(false)
      }
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [pickerOpen])

  return (
    <div className="calendar-picker" ref={pickerRef}>
      <button
        type="button"
        className="calendar-picker-button"
        onClick={() => {
          setPickerView('month')
          setPickerOpen((prev) => !prev)
        }}
        aria-label="เลือกเดือนและปี"
      >
        <span>{calendarLabel}</span>
        <span className="calendar-picker-caret">▾</span>
      </button>
      {pickerOpen && (
        <div className="calendar-picker-popover" role="dialog" aria-label="เลือกเดือนและปี">
          {pickerView === 'month' ? (
            <>
              <div className="calendar-picker-header">
                <span className="calendar-picker-heading">เลือกเดือน</span>
                <div className="calendar-picker-actions">
                  <button type="button" className="calendar-now-button" onClick={handlePickCurrentMonth}>
                    เดือนปัจจุบัน
                  </button>
                  <button type="button" className="calendar-year-button" onClick={() => setPickerView('year')}>
                    {calendarYearValue}
                  </button>
                </div>
              </div>
              <div className="calendar-month-grid">
                {MONTH_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`calendar-month-option ${option.value === calendarMonthValue ? 'active' : ''}`}
                    onClick={() => {
                      onChange?.(`${calendarYearValue}-${option.value}`)
                      setPickerOpen(false)
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="calendar-year-header">
                <button
                  type="button"
                  className="btn tertiary small"
                  onClick={() => setYearGridStart((prev) => Math.max(CALENDAR_YEAR_START, prev - YEAR_GRID_SIZE))}
                  disabled={yearGridStart <= CALENDAR_YEAR_START}
                >
                  ก่อนหน้า
                </button>
                <span className="calendar-year-range">
                  {yearGridStart} - {yearGridLabelEnd}
                </span>
                <button
                  type="button"
                  className="btn tertiary small"
                  onClick={() => setYearGridStart((prev) => Math.min(yearGridMaxStart, prev + YEAR_GRID_SIZE))}
                  disabled={yearGridStart >= yearGridMaxStart}
                >
                  ถัดไป
                </button>
              </div>
              <div className="calendar-year-grid">
                {yearGridYears.map((year) => (
                  <button
                    key={year}
                    type="button"
                    className={`calendar-year-option ${String(year) === calendarYearValue ? 'active' : ''}`}
                    onClick={() => {
                      onChange?.(`${year}-${calendarMonthValue}`)
                      setPickerView('month')
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
              <button type="button" className="calendar-year-back" onClick={() => setPickerView('month')}>
                กลับไปเลือกเดือน
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function BookingPage({
  employees,
  employeeSearch,
  onEmployeeSearchChange,
  selectedEmployee,
  bookingMode,
  onBookingModeChange,
  bookingStartDate,
  bookingEndDate,
  setBookingStartDate,
  setBookingEndDate,
  multiDates,
  multiDateInput,
  setMultiDateInput,
  onAddMultiDate,
  onRemoveMultiDate,
  offices,
  selectedOffice,
  onOfficeChange,
  departments,
  selectedDepartment,
  onDepartmentChange,
  seatRequired,
  seats,
  selectedSeat,
  setSelectedSeat,
  selectedPurpose,
  setSelectedPurpose,
  purposes,
  note,
  setNote,
  onSubmit,
  onReset,
  calendarState,
  calendarMonth,
  onCalendarMonthChange,
  bookingDisabled,
  onOpenBooking,
}) {
  const [dayModal, setDayModal] = useState({ open: false, date: '', entries: [] })

  const openDayModal = useCallback((dateKey, entries) => {
    setDayModal({ open: true, date: dateKey, entries })
  }, [])

  const closeDayModal = useCallback(() => {
    setDayModal({ open: false, date: '', entries: [] })
  }, [])

  const calendarDays = useMemo(() => {
    const [year, month] = String(calendarMonth ?? '').split('-').map(Number)
    const baseDate = year && month ? new Date(year, month - 1, 1) : new Date()
    const monthIndex = baseDate.getMonth()
    const firstOfMonth = new Date(baseDate.getFullYear(), monthIndex, 1)
    const startOffset = firstOfMonth.getDay()
    const startDate = new Date(baseDate.getFullYear(), monthIndex, 1 - startOffset)
    const days = []
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
      days.push({
        date,
        dateKey: toDateString(date),
        inMonth: date.getMonth() === monthIndex,
      })
    }
    return days
  }, [calendarMonth])

  const bookingsByDate = useMemo(() => {
    const map = new Map()
    calendarState.rows.forEach((row) => {
      const dateKey = row.booking_date?.slice(0, 10)
      if (!dateKey) return
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey).push(row)
    })
    return map
  }, [calendarState.rows])

  const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  const todayKey = TODAY

  return (
    <section className="tab-panel active">
      <div className="card">
        <h2>ฟอร์มจองเข้าออฟฟิศ</h2>
        <form className="form-grid" onSubmit={onSubmit} onReset={onReset}>
          <label>
            พนักงาน
            <input
              type="text"
              list="employee-options"
              placeholder="ระบุรหัส ชื่อ หรือ นามสกุล"
              value={employeeSearch}
              onChange={onEmployeeSearchChange}
              required
            />
            <datalist id="employee-options">
              {employees.map((emp) => (
                <option key={emp.user_id} value={formatEmployeeOption(emp)}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </datalist>
            {selectedEmployee && (
              <span className="hint-text">
                {formatEmployeeOption(selectedEmployee)}
              </span>
            )}
          </label>
          <div className="span-2 booking-mode">
            <span className="booking-mode-label">รูปแบบการจอง</span>
            <div className="booking-mode-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="booking-mode"
                  value="range"
                  checked={bookingMode === 'range'}
                  onChange={(e) => onBookingModeChange(e.target.value)}
                />
                <span>ช่วงวันที่ต่อเนื่อง</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="booking-mode"
                  value="multi"
                  checked={bookingMode === 'multi'}
                  onChange={(e) => onBookingModeChange(e.target.value)}
                />
                <span>เลือกวันเฉพาะ</span>
              </label>
            </div>
          </div>

          {bookingMode === 'range' ? (
            <div className="date-range span-2">
              <label>
                วันที่เริ่มต้น
                <input
                  type="date"
                  lang="en-GB"
                  data-date={formatDateInput(bookingStartDate)}
                  data-empty={bookingStartDate ? 'false' : 'true'}
                  value={bookingStartDate}
                  onChange={(e) => setBookingStartDate(e.target.value)}
                  required
                />
              </label>
              <div className="range-sep" aria-hidden="true">ถึง</div>
              <label>
                วันที่สิ้นสุด
                <input
                  type="date"
                  lang="en-GB"
                  data-date={formatDateInput(bookingEndDate)}
                  data-empty={bookingEndDate ? 'false' : 'true'}
                  value={bookingEndDate}
                  min={bookingStartDate}
                  onChange={(e) => setBookingEndDate(e.target.value)}
                  required
                />
              </label>
            </div>
          ) : (
            <label className="span-2">
              วันที่ที่ต้องการเข้าออฟฟิศ
              <div className="multi-date-input">
                <input
                  type="date"
                  lang="en-GB"
                  data-date={formatDateInput(multiDateInput)}
                  data-empty={multiDateInput ? 'false' : 'true'}
                  value={multiDateInput}
                  onChange={(e) => setMultiDateInput(e.target.value)}
                />
                <button type="button" className="btn secondary" onClick={onAddMultiDate}>
                  เพิ่มวัน
                </button>
              </div>
              {multiDates.length ? (
                <ul className="date-chip-list">
                  {multiDates.map((date) => (
                    <li key={date} className="date-chip">
                      <span>{formatDate(date)}</span>
                      <button type="button" onClick={() => onRemoveMultiDate(date)} aria-label={`ลบ ${date}`}>
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="hint-text">ยังไม่ได้เลือกวันเพิ่มเติม</span>
              )}
            </label>
          )}
          <label>
            ออฟฟิศ
            <select value={selectedOffice} onChange={onOfficeChange} disabled={Boolean(selectedEmployee)}>
              <option value="">-- เลือกออฟฟิศ --</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ฝ่ายงาน
            <select value={selectedDepartment} onChange={onDepartmentChange} required disabled={Boolean(selectedEmployee)}>
              <option value="">-- เลือกฝ่ายงาน --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </label>
          {seatRequired && (
            <label>
              ที่นั่ง (ฝ่ายนี้ต้องเลือกที่นั่งเฉพาะ)
              <select value={selectedSeat} onChange={(e) => setSelectedSeat(e.target.value)} required>
                <option value="">-- เลือกที่นั่ง --</option>
                {seats.map((seat) => (
                  <option key={seat.id} value={seat.id}>
                    {seat.seat_code}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            เหตุผลการเข้าออฟฟิศ
            <select value={selectedPurpose} onChange={(e) => setSelectedPurpose(e.target.value)}>
              <option value="">-- เลือกเหตุผล --</option>
              {purposes.map((purpose) => (
                <option key={purpose.id} value={purpose.id}>
                  {purpose.name}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            บันทึกเพิ่มเติม
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)" />
          </label>
          <div className="form-actions span-2">
            <button type="submit" className="btn primary" disabled={bookingDisabled}>
              บันทึกการจอง
            </button>
            <button type="reset" className="btn secondary">
              ล้างข้อมูล
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="calendar-header">
          <h2>ปฏิทินการจองล่าสุด</h2>
          <div className="calendar-controls">
            <button
              type="button"
              className="btn secondary small"
              onClick={() => onCalendarMonthChange?.(shiftMonth(calendarMonth, -1))}
            >
              เดือนก่อนหน้า
            </button>
            <MonthYearPicker value={calendarMonth} onChange={onCalendarMonthChange} />
            <button
              type="button"
              className="btn secondary small"
              onClick={() => onCalendarMonthChange?.(shiftMonth(calendarMonth, 1))}
            >
              เดือนถัดไป
            </button>
          </div>
        </div>
        <DataRegion state={calendarState} allowEmpty>
          <div className="calendar-body">
            <div className="calendar-weekdays">
              {weekDays.map((day) => (
                <div key={day} className="calendar-weekday">
                  {day}
                </div>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((day) => {
                const entries = bookingsByDate.get(day.dateKey) ?? []
                return (
                  <div
                    key={day.dateKey}
                    className={`calendar-cell ${day.inMonth ? '' : 'is-outside'} ${day.dateKey === todayKey ? 'is-today' : ''}`}
                  >
                    <div className="calendar-date">{day.date.getDate()}</div>
                    <div className="calendar-bookings">
                      {entries.slice(0, CALENDAR_PREVIEW_LIMIT).map((entry) => {
                        const status = (entry.status ?? '').toUpperCase()
                        const statusClass = status === 'CANCELLED' ? 'is-cancelled' : 'is-booked'
                        return (
                          <button
                            key={entry.booking_id}
                            type="button"
                            className={`calendar-booking ${statusClass}`}
                            onClick={() => onOpenBooking?.(entry.booking_id)}
                            title={`${formatEmployeeFromRow(entry)} • ${entry.purpose_name ?? '-'}`}
                          >
                            {formatEmployeeFromRow(entry)}
                          </button>
                        )
                      })}
                      {entries.length > CALENDAR_PREVIEW_LIMIT && (
                        <button
                          type="button"
                          className="calendar-more"
                          onClick={() => openDayModal(day.dateKey, entries)}
                        >
                          +อีก {entries.length - CALENDAR_PREVIEW_LIMIT}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </DataRegion>
      </div>
      {dayModal.open && (
        <DayBookingModal
          date={dayModal.date}
          entries={dayModal.entries}
          onClose={closeDayModal}
          onEdit={(bookingId) => {
            closeDayModal()
            onOpenBooking?.(bookingId)
          }}
        />
      )}
    </section>
  )
}

function DayBookingModal({ date, entries, onClose, onEdit }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>รายการจองวันที่ {formatDate(date)}</h2>
        <div className="day-booking-list">
          {entries.map((entry) => (
            <div key={entry.booking_id} className="day-booking-item">
              <div className="day-booking-info">
                <span className="day-booking-name">{formatEmployeeFromRow(entry)}</span>
                <span className="day-booking-meta">
                  {entry.department_name ?? '-'} • {entry.purpose_name ?? '-'}
                </span>
              </div>
              <div className="day-booking-actions">
                <StatusPill status={entry.status} />
                <button
                  type="button"
                  className="btn small"
                  onClick={() => onEdit(entry.booking_id)}
                  disabled={!entry.booking_id}
                >
                  แก้ไข
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

function HolidayPage({ offices, holidayState, onCreate, onUpdate, onDelete, supabaseConfigured }) {
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    holiday_date: '',
    holiday_name: '',
    office_id: '',
    description: '',
  })

  const resetForm = useCallback(() => {
    setEditingId(null)
    setForm({
      holiday_date: '',
      holiday_name: '',
      office_id: '',
      description: '',
    })
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const holidayName = form.holiday_name.trim()
    if (!form.holiday_date || !holidayName) {
      alert('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    const payload = {
      holiday_date: form.holiday_date,
      name: holidayName,
      office_id: form.office_id || null,
      description: form.description.trim() || null,
    }
    const success = editingId ? await onUpdate(editingId, payload) : await onCreate(payload)
    if (success) {
      resetForm()
    }
  }

  const handleEdit = (row) => {
    setEditingId(row.id ?? null)
    setForm({
      holiday_date: row.holiday_date ?? '',
      holiday_name: row.holiday_name ?? '',
      office_id: row.office_id ?? '',
      description: row.description ?? '',
    })
  }

  const handleDelete = async (row) => {
    if (!row.id) return
    const confirmed = window.confirm('ยืนยันการลบวันหยุดนี้หรือไม่?')
    if (!confirmed) return
    const success = await onDelete(row.id)
    if (success && editingId === row.id) {
      resetForm()
    }
  }

  return (
    <section className="tab-panel active">
      <div className="card">
        <h2>จัดการวันหยุดประจำปี</h2>
        <form className="inline-form" onSubmit={handleSubmit}>
          <label>
            วันที่หยุด
            <input
              type="date"
              lang="en-GB"
              data-date={formatDateInput(form.holiday_date)}
              data-empty={form.holiday_date ? 'false' : 'true'}
              name="holiday_date"
              value={form.holiday_date}
              onChange={(e) => setForm((prev) => ({ ...prev, holiday_date: e.target.value }))}
              required
            />
          </label>
          <label>
            ชื่อวันหยุด
            <input
              type="text"
              name="holiday_name"
              placeholder="เช่น วันปีใหม่"
              value={form.holiday_name}
              onChange={(e) => setForm((prev) => ({ ...prev, holiday_name: e.target.value }))}
              required
            />
          </label>
          <label>
            รายละเอียด
            <textarea
              name="description"
              rows="1"
              placeholder="เช่น บริษัทปิดทำการ"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            ></textarea>
          </label>
          <label>
            ออฟฟิศ (เว้นว่าง = ทุกออฟฟิศ)
            <select
              name="office_id"
              value={form.office_id}
              onChange={(e) => setForm((prev) => ({ ...prev, office_id: e.target.value }))}
            >
              <option value="">ทุกออฟฟิศ</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={!supabaseConfigured}>
              {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มวันหยุด'}
            </button>
            <button type="button" className="btn secondary" onClick={resetForm}>
              {editingId ? 'ยกเลิก' : 'ล้างฟอร์ม'}
            </button>
          </div>
        </form>

        <div className="table-wrapper">
          <DataRegion state={holidayState}>
            <table>
              <thead>
                <tr>
                  <th className="cell-nowrap">วันที่</th>
                  <th>ชื่อวันหยุด</th>
                  <th className="cell-nowrap">ออฟฟิศ</th>
                  <th>รายละเอียด</th>
                  <th className="cell-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {holidayState.rows.length ? (
                  holidayState.rows.map((row, index) => (
                    <tr key={row.id ?? `${row.holiday_date}-${row.office_name ?? 'all'}-${index}`}>
                      <td className="cell-nowrap">{formatDate(row.holiday_date)}</td>
                      <td>{row.holiday_name}</td>
                      <td className="cell-nowrap">{row.office_name}</td>
                      <td className="cell-wrap">{row.description ?? '-'}</td>
                      <td className="cell-nowrap">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn small"
                            onClick={() => handleEdit(row)}
                            disabled={!row.id}
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            className="btn danger small"
                            onClick={() => handleDelete(row)}
                            disabled={!supabaseConfigured || !row.id}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      ยังไม่มีข้อมูลวันหยุด
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </DataRegion>
        </div>
      </div>
    </section>
  )
}

function DepartmentMasterPage({ supabase, supabaseConfigured, departments, offices, strategies, reloadDepartments }) {
  const defaultStrategyCode = strategies?.[0]?.code ?? DEFAULT_STRATEGIES[0].code
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    office_id: '',
    name: '',
    booking_strategy: defaultStrategyCode,
    seat_capacity: '',
    is_active: true,
  })

  useEffect(() => {
    if (!editingId) {
      setForm((prev) => ({
        ...prev,
        booking_strategy: defaultStrategyCode,
      }))
    }
  }, [defaultStrategyCode, editingId])

  const strategyOptions = useMemo(() => (strategies?.length ? strategies : DEFAULT_STRATEGIES), [strategies])

  const officeLookup = useMemo(() => {
    const map = new Map()
    offices.forEach((office) => map.set(office.id, office.name))
    return map
  }, [offices])

  const strategyLookup = useMemo(() => {
    const map = new Map()
    strategyOptions.forEach((strategy) => map.set(strategy.code, strategy.display_name ?? strategy.code))
    return map
  }, [strategyOptions])

  const resetForm = useCallback(() => {
    setEditingId(null)
    setForm({
      office_id: '',
      name: '',
      booking_strategy: defaultStrategyCode,
      seat_capacity: '',
      is_active: true,
    })
  }, [defaultStrategyCode])

  const handleStrategyChange = (event) => {
    const value = event.target.value
    setForm((prev) => ({
      ...prev,
      booking_strategy: value,
      seat_capacity: value === 'CAPACITY' ? prev.seat_capacity : '',
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!supabaseConfigured || !supabase) {
      alert(SUPABASE_ENV_HINT)
      return
    }
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      alert('กรุณากรอกชื่อฝ่ายงาน')
      return
    }
    let seatCapacityValue = null
    if (form.booking_strategy === 'CAPACITY') {
      if (!form.seat_capacity) {
        alert('กรุณากรอกจำนวนความจุสำหรับฝ่ายที่จำกัดความจุ')
        return
      }
      seatCapacityValue = Number(form.seat_capacity)
      if (!Number.isFinite(seatCapacityValue) || seatCapacityValue <= 0 || !Number.isInteger(seatCapacityValue)) {
        alert('จำนวนความจุต้องเป็นจำนวนเต็มมากกว่า 0')
        return
      }
    }

    const payload = {
      office_id: form.office_id || null,
      name: trimmedName,
      booking_strategy: form.booking_strategy,
      seat_capacity: seatCapacityValue,
      is_active: form.is_active,
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('departments').update(payload).eq('id', editingId)
        if (error) throw error
        alert('อัปเดตข้อมูลฝ่ายงานเรียบร้อยแล้ว')
      } else {
        const { error } = await supabase.from('departments').insert(payload)
        if (error) throw error
        alert('เพิ่มฝ่ายงานเรียบร้อยแล้ว')
      }
      await reloadDepartments()
      resetForm()
    } catch (error) {
      console.error(error)
      alert(error.message || 'ไม่สามารถบันทึกข้อมูลฝ่ายงานได้')
    }
  }

  const handleEdit = (department) => {
    console.log('Editing department', department)
    setEditingId(department.id)
    setForm({
      office_id: department.office_id ?? '',
      name: department.name ?? '',
      booking_strategy: department.booking_strategy ?? defaultStrategyCode,
      seat_capacity: department.seat_capacity != null ? String(department.seat_capacity) : '',
      is_active: department.is_active ?? true,
    })
  }

  const handleDelete = async (id) => {
    if (!supabaseConfigured || !supabase) {
      alert(SUPABASE_ENV_HINT)
      return
    }
    const confirmed = window.confirm('ยืนยันการลบฝ่ายงานนี้หรือไม่?')
    if (!confirmed) return
    try {
      const { error } = await supabase.from('departments').delete().eq('id', id)
      if (error) throw error
      alert('ลบฝ่ายงานเรียบร้อยแล้ว')
      if (editingId === id) {
        resetForm()
      }
      await reloadDepartments()
    } catch (error) {
      console.error(error)
      alert(error.message || 'ไม่สามารถลบฝ่ายงานได้')
    }
  }

  return (
    <section className="tab-panel active master-layout">
      <div className="card">
        <h2>จัดการฝ่ายงาน</h2>
        <p className="hint-text">สร้างหรือแก้ไขฝ่ายงาน พร้อมกำหนดประเภทการจอง</p>
        {!supabaseConfigured && (
          <p className="hint warning">เชื่อมต่อ Supabase เพื่อบันทึกข้อมูลจริง ระบบกำลังใช้ข้อมูลตัวอย่าง</p>
        )}
        <form className="master-form" onSubmit={handleSubmit}>
          <label>
            ออฟฟิศ
            <select value={form.office_id} onChange={(e) => setForm((prev) => ({ ...prev, office_id: e.target.value }))}>
              <option value="">ทุกออฟฟิศ</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ชื่อฝ่ายงาน
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </label>
          <label>
            ประเภทการจอง
            <select value={form.booking_strategy} onChange={handleStrategyChange}>
              {strategyOptions.map((strategy) => (
                <option key={strategy.code} value={strategy.code}>
                  {strategy.display_name ?? strategy.code}
                </option>
              ))}
            </select>
          </label>
          {form.booking_strategy === 'CAPACITY' && (
            <label>
              ความจุต่อวัน
              <input
                type="number"
                min="1"
                value={form.seat_capacity}
                onChange={(e) => setForm((prev) => ({ ...prev, seat_capacity: e.target.value }))}
                required
              />
            </label>
          )}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            <span>เปิดใช้งาน</span>
          </label>
          <div className="form-footer">
            <button type="submit" className="btn primary" disabled={!supabaseConfigured}>
              {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มฝ่ายงาน'}
            </button>
            <button type="button" className="btn secondary" onClick={resetForm}>
              ล้างฟอร์ม
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>รายการฝ่ายงาน</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ชื่อฝ่ายงาน</th>
                <th className="cell-nowrap">ออฟฟิศ</th>
                <th className="cell-nowrap">ประเภท</th>
                <th className="cell-nowrap">ความจุ</th>
                <th className="cell-nowrap">สถานะ</th>
                <th className="cell-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {departments.length ? (
                departments.map((department) => (
                  <tr key={department.id}>
                    <td>{department.name}</td>
                    <td className="cell-nowrap">{officeLookup.get(department.office_id) ?? '-'}</td>
                    <td className="cell-nowrap">
                      {strategyLookup.get(department.booking_strategy) ?? department.booking_strategy}
                    </td>
                    <td className="cell-nowrap">
                      {department.booking_strategy === 'CAPACITY' ? department.seat_capacity ?? '-' : '-'}
                    </td>
                    <td className="cell-nowrap">
                      <span className={`badge ${department.is_active ? 'active' : 'inactive'}`}>
                        {department.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="cell-nowrap">
                      <div className="table-actions">
                        <button type="button" className="btn small" onClick={() => handleEdit(department)}>
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          className="btn danger small"
                          onClick={() => handleDelete(department.id)}
                          disabled={!supabaseConfigured}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    ยังไม่มีข้อมูลฝ่ายงาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function EmployeeMasterPage({ supabase, supabaseConfigured, employees, departments, reloadEmployees }) {
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    employee_code: '',
    first_name: '',
    last_name: '',
    email: '',
    department_id: '',
    start_date: '',
    is_active: true,
  })

  const departmentLookup = useMemo(() => {
    const map = new Map()
    departments.forEach((dept) => map.set(dept.id, dept.name))
    return map
  }, [departments])

  const resetForm = useCallback(() => {
    setEditingId(null)
    setForm({
      employee_code: '',
      first_name: '',
      last_name: '',
      email: '',
      department_id: '',
      start_date: '',
      is_active: true,
    })
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!supabaseConfigured || !supabase) {
      alert(SUPABASE_ENV_HINT)
      return
    }
    const code = form.employee_code.trim()
    const firstName = form.first_name.trim()
    const lastName = form.last_name.trim()
    if (!code || !firstName || !lastName) {
      alert('กรุณากรอกข้อมูลพนักงานให้ครบถ้วน (รหัส ชื่อ นามสกุล)')
      return
    }
    const payload = {
      employee_code: code,
      first_name: firstName,
      last_name: lastName,
      email: form.email.trim() || null,
      department_id: form.department_id || null,
      start_date: form.start_date || null,
      is_active: form.is_active,
    }
    try {
      if (editingId) {
        const { error } = await supabase.from('employee_profiles').update(payload).eq('user_id', editingId)
        if (error) throw error
        alert('อัปเดตข้อมูลพนักงานเรียบร้อยแล้ว')
      } else {
        const { error } = await supabase.from('employee_profiles').insert(payload)
        if (error) throw error
        alert('เพิ่มพนักงานเรียบร้อยแล้ว')
      }
      await reloadEmployees()
      resetForm()
    } catch (error) {
      console.error(error)
      alert(error.message || 'ไม่สามารถบันทึกข้อมูลพนักงานได้')
    }
  }

  const handleEdit = (employee) => {
    setEditingId(employee.user_id)
    setForm({
      employee_code: employee.employee_code ?? '',
      first_name: employee.first_name ?? '',
      last_name: employee.last_name ?? '',
      email: employee.email ?? '',
      department_id: employee.department_id ?? '',
      start_date: employee.start_date ? String(employee.start_date).slice(0, 10) : '',
      is_active: employee.is_active ?? true,
    })
  }

  const handleDelete = async (userId) => {
    if (!supabaseConfigured || !supabase) {
      alert(SUPABASE_ENV_HINT)
      return
    }
    const confirmed = window.confirm('ยืนยันการลบพนักงานนี้หรือไม่?')
    if (!confirmed) return
    try {
      const { error } = await supabase.from('employee_profiles').delete().eq('user_id', userId)
      if (error) throw error
      alert('ลบพนักงานเรียบร้อยแล้ว')
      if (editingId === userId) {
        resetForm()
      }
      await reloadEmployees()
    } catch (error) {
      console.error(error)
      alert(error.message || 'ไม่สามารถลบข้อมูลพนักงานได้')
    }
  }

  return (
    <section className="tab-panel active master-layout">
      <div className="card">
        <h2>จัดการพนักงาน</h2>
        <p className="hint-text">เพิ่ม แก้ไข หรือลบข้อมูลพนักงานสำหรับการจองเข้าออฟฟิศ</p>
        {!supabaseConfigured && (
          <p className="hint warning">เชื่อมต่อ Supabase เพื่อบันทึกข้อมูลจริง ระบบกำลังใช้ข้อมูลตัวอย่าง</p>
        )}
        <form className="master-form" onSubmit={handleSubmit}>
          <label>
            รหัสพนักงาน
            <input
              type="text"
              value={form.employee_code}
              onChange={(e) => setForm((prev) => ({ ...prev, employee_code: e.target.value }))}
              required
            />
          </label>
          <label>
            ชื่อ
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
              required
            />
          </label>
          <label>
            นามสกุล
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
              required
            />
          </label>
          <label>
            อีเมล
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </label>
          <label>
            ฝ่ายงาน
            <select
              value={form.department_id}
              onChange={(e) => setForm((prev) => ({ ...prev, department_id: e.target.value }))}
            >
              <option value="">ไม่ระบุฝ่าย</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            วันที่เริ่มงาน
            <input
              type="date"
              lang="en-GB"
              data-date={formatDateInput(form.start_date)}
              data-empty={form.start_date ? 'false' : 'true'}
              value={form.start_date}
              onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            <span>เปิดใช้งาน</span>
          </label>
          <div className="form-footer centered">
            <button type="submit" className="btn primary" disabled={!supabaseConfigured}>
              {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มพนักงาน'}
            </button>
            <button type="button" className="btn secondary" onClick={resetForm}>
              ล้างฟอร์ม
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>รายการพนักงาน</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th className="cell-nowrap">รหัส</th>
                <th className="cell-nowrap">ชื่อ-นามสกุล</th>
                <th className="cell-nowrap">อีเมล</th>
                <th className="cell-nowrap">ฝ่ายงาน</th>
                <th className="cell-nowrap">วันที่เริ่มงาน</th>
                <th className="cell-nowrap">สถานะ</th>
                <th className="cell-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {employees.length ? (
                employees.map((employee) => (
                  <tr key={employee.user_id}>
                    <td className="cell-nowrap">{employee.employee_code}</td>
                    <td className="cell-nowrap">{`${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim()}</td>
                    <td className="cell-nowrap">{employee.email ?? '-'}</td>
                    <td className="cell-nowrap">{departmentLookup.get(employee.department_id) ?? '-'}</td>
                    <td className="cell-nowrap">{formatDate(employee.start_date)}</td>
                    <td className="cell-nowrap">
                      <span className={`badge ${employee.is_active ? 'active' : 'inactive'}`}>
                        {employee.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="cell-nowrap">
                      <div className="table-actions">
                        <button type="button" className="btn small" onClick={() => handleEdit(employee)}>
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          className="btn danger small"
                          onClick={() => handleDelete(employee.user_id)}
                          disabled={!supabaseConfigured}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    ยังไม่มีข้อมูลพนักงาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function ReportsPage({
  dailyStatus,
  reloadDailyStatus,
  capacityReport,
  reloadCapacity,
  deptMonthly,
  reloadDeptMonthly,
  monthFilter,
  setMonthFilter,
  employeeYearly,
  reloadEmployeeYearly,
  historyReport,
  reloadHistory,
  holidayReport,
  reloadHolidayOverview,
}) {
  const [activeReport, setActiveReport] = useState('daily-status')

  const handleMonthSubmit = useCallback(
    (event) => {
      event.preventDefault()
      reloadDeptMonthly(monthFilter)
    },
    [reloadDeptMonthly, monthFilter]
  )

  const reports = useMemo(
    () => [
      {
        id: 'daily-status',
        title: 'สรุปการจองรายวัน',
        viewName: 'boksite.booking_status_daily_summary',
        state: dailyStatus,
        onRefresh: reloadDailyStatus,
        content: (
          <ReportTable
            rows={dailyStatus.rows}
            columns={[
              { key: 'booking_date', label: 'วันที่', formatter: formatDate, nowrap: true },
              { key: 'purpose_name', label: 'เหตุผล' },
              { key: 'status', label: 'สถานะ', nowrap: true },
              { key: 'total', label: 'จำนวน', nowrap: true },
            ]}
          />
        ),
      },
      {
        id: 'capacity',
        title: 'ความจุต่อฝ่าย',
        viewName: 'boksite.department_daily_capacity_usage',
        state: capacityReport,
        onRefresh: reloadCapacity,
        content: (
          <ReportTable
            rows={capacityReport.rows}
            columns={[
              { key: 'booking_date', label: 'วันที่', formatter: formatDate, nowrap: true },
              { key: 'department_name', label: 'ฝ่ายงาน' },
              { key: 'office_name', label: 'ออฟฟิศ' },
              { key: 'active_bookings', label: 'จองแล้ว', nowrap: true },
              { key: 'seat_capacity', label: 'ความจุ', nowrap: true },
              { key: 'remaining_capacity', label: 'คงเหลือ', nowrap: true },
            ]}
          />
        ),
      },
      {
        id: 'dept-monthly',
        title: 'ยอดจองรายเดือน',
        viewName: 'boksite.department_monthly_attendance',
        state: deptMonthly,
        onRefresh: () => reloadDeptMonthly(monthFilter),
        actions: (
          <form className="filter-form" onSubmit={handleMonthSubmit}>
            <MonthYearPicker value={monthFilter} onChange={setMonthFilter} />
            <button type="submit" className="btn tertiary">
              ดูข้อมูล
            </button>
          </form>
        ),
        content: (
          <ReportTable
            rows={deptMonthly.rows}
            columns={[
              { key: 'month_start', label: 'เดือน', formatter: formatMonth, nowrap: true },
              { key: 'department_name', label: 'ฝ่ายงาน' },
              { key: 'office_name', label: 'ออฟฟิศ' },
              { key: 'total_bookings', label: 'จำนวนจอง', nowrap: true },
            ]}
          />
        ),
      },
      {
        id: 'employee-yearly',
        title: 'ยอดเข้าออฟฟิศต่อปี (พนักงาน)',
        viewName: 'boksite.employee_yearly_attendance',
        state: employeeYearly,
        onRefresh: reloadEmployeeYearly,
        content: (
          <ReportTable
            rows={employeeYearly.rows}
            columns={[
              { key: 'employee_code', label: 'รหัสพนักงาน', nowrap: true },
              { key: 'first_name', label: 'ชื่อ' },
              { key: 'last_name', label: 'นามสกุล' },
              { key: 'year', label: 'ปี', nowrap: true },
              { key: 'total_booked_days', label: 'จำนวนวันที่เข้า', nowrap: true },
            ]}
          />
        ),
      },
      {
        id: 'history',
        title: 'ประวัติการจองล่าสุด',
        viewName: 'boksite.employee_booking_history',
        state: historyReport,
        onRefresh: reloadHistory,
        content: (
          <div className="scrollable">
            <ReportTable
              rows={historyReport.rows}
              columns={[
                { key: 'booking_date', label: 'วันที่', formatter: formatDate, nowrap: true },
                { key: 'department_name', label: 'ฝ่ายงาน' },
                { key: 'office_name', label: 'ออฟฟิศ' },
                { key: 'status', label: 'สถานะ', nowrap: true },
                { key: 'purpose_name', label: 'เหตุผล' },
              ]}
            />
          </div>
        ),
      },
      {
        id: 'upcoming-holidays',
        title: 'วันหยุดที่กำลังมาถึง',
        viewName: 'boksite.office_holiday_overview',
        state: holidayReport,
        onRefresh: reloadHolidayOverview,
        content: (
          <ReportTable
            rows={holidayReport.rows}
            columns={[
              { key: 'holiday_date', label: 'วันที่', formatter: formatDate, nowrap: true },
              { key: 'holiday_name', label: 'ชื่อวันหยุด' },
              { key: 'office_name', label: 'ออฟฟิศ' },
              { key: 'description', label: 'รายละเอียด' },
            ]}
          />
        ),
      },
    ],
    [
      capacityReport,
      dailyStatus,
      deptMonthly,
      employeeYearly,
      handleMonthSubmit,
      holidayReport,
      historyReport,
      monthFilter,
      reloadCapacity,
      reloadDailyStatus,
      reloadDeptMonthly,
      reloadEmployeeYearly,
      reloadHolidayOverview,
      reloadHistory,
    ]
  )

  const active = reports.find((report) => report.id === activeReport) ?? reports[0]

  return (
    <section className="tab-panel active reports-layout">
      <div className="card report-menu">
        <h2>เลือกรายงาน</h2>
        <p className="hint-text">เลือกชื่อรายงานเพื่อดูข้อมูลจากระบบ</p>
        <ul className="report-menu-list">
          {reports.map((report) => (
            <li key={report.id}>
              <button
                type="button"
                className={`report-menu-button ${report.id === active?.id ? 'active' : ''}`}
                onClick={() => setActiveReport(report.id)}
              >
                {report.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {active ? (
        <ReportCard
          key={active.id}
          title={active.title}
          viewName={active.viewName}
          onRefresh={active.onRefresh}
          state={active.state}
          actions={active.actions}
        >
          {active.content}
        </ReportCard>
      ) : (
        <div className="card">
          <p>เลือกชื่อรายงานจากด้านซ้ายเพื่อดูรายละเอียด</p>
        </div>
      )}
    </section>
  )
}

function ReportCard({ title, onRefresh, state, children, actions, viewName }) {
  return (
    <div className="report-card">
      <header>
        <div className="report-card-heading">
          <h3>{title}</h3>
          {viewName && <span className="report-source">SELECT * FROM {viewName}</span>}
        </div>
        <div className="card-actions">
          {actions}
          <button className="btn tertiary" onClick={onRefresh}>
            รีเฟรช
          </button>
        </div>
      </header>
      <DataRegion state={state}>{children}</DataRegion>
    </div>
  )
}

function ReportTable({ rows, columns }) {
  if (!rows.length) return <EmptyState message="ไม่มีข้อมูลสำหรับช่วงนี้" />

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.nowrap ? 'cell-nowrap' : ''}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((column) => (
                <td key={column.key} className={column.nowrap ? 'cell-nowrap' : 'cell-wrap'}>
                  {column.formatter ? column.formatter(row[column.key]) : row[column.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DataRegion({ state, children, allowEmpty = false }) {
  if (state.loading) return <LoadingState />
  if (!state.rows.length && !allowEmpty) return <EmptyState message="ไม่มีข้อมูลสำหรับช่วงนี้" />
  return children
}

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner" aria-hidden="true" />
      <span>กำลังโหลดข้อมูล...</span>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  )
}

function StatusPill({ status }) {
  return (
    <span className="status-pill" data-status={status}>
      {status}
    </span>
  )
}

function formatEmployeeOption(emp) {
  if (!emp) return ''
  const code = emp.employee_code ? `${emp.employee_code}` : ''
  const name = `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim()
  return [code, name].filter(Boolean).join(' - ')
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateInput(value) {
  if (!value) return 'dd/mm/yyyy'
  const parts = value.split('-')
  if (parts.length !== 3) return value
  const [year, month, day] = parts
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function formatMonth(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
}

export default App

// Fallback formatter for employee name on booking rows coming from views
function formatEmployeeFromRow(row) {
  if (!row) return '-'
  const code = row.employee_code ?? ''
  const name = (
    row.employee_name ?? [row.first_name, row.last_name].filter(Boolean).join('\u00A0').trim()
  ) || ''
  const both = [code, name].filter(Boolean).join(' - ')
  return both || code || name || '-'
}

function formatEmployeeCode(row) {
  return row?.employee_code ?? ''
}

function formatEmployeeName(row) {
  const name = (
    row?.employee_name ?? [row?.first_name, row?.last_name].filter(Boolean).join('\u00A0').trim()
  ) || ''
  return name
}

function BookingEditModal({ loading, form, onChange, onClose, onSave, departments, purposes, seats, strategies, employees }) {
  const dept = useMemo(() => departments.find((d) => d.id === form?.department_id) ?? null, [departments, form])
  const seatRequired = dept?.booking_strategy === 'ASSIGNED'
  const filteredSeats = useMemo(() => {
    if (!form?.department_id) return []
    return seats.filter((s) => s.department_id === form.department_id)
  }, [seats, form])
  const statusOptions = ['BOOKED', 'CANCELLED']
  const eligibleEmps = useMemo(() => {
    if (form?.department_id) return employees.filter((e) => e.department_id === form.department_id)
    return employees
  }, [employees, form])

  const [employeeSearch, setEmployeeSearch] = useState('')
  useEffect(() => {
    if (!form) return
    const emp = employees.find((e) => e.user_id === form.user_id)
    if (emp) setEmployeeSearch(formatEmployeeOption(emp))
  }, [employees, form])

  if (!form) return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>ดูรายละเอียดการจอง</h2>
        <p className="hint">ไม่พบข้อมูลการจอง</p>
        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>รายละเอียดการจอง</h2>
        {loading ? (
          <div className="loading-state"><div className="spinner" aria-hidden="true" /> กำลังโหลด...</div>
        ) : (
          <form className="modal-form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
            <label>
              พนักงาน
              <input
                type="text"
                list="modal-employee-options"
                placeholder="ระบุรหัส ชื่อ หรือ นามสกุล"
                value={employeeSearch}
                onChange={(e) => {
                  const value = e.target.value
                  setEmployeeSearch(value)
                  const lower = value.toLowerCase()
                  const exact = eligibleEmps.find((emp) => formatEmployeeOption(emp).toLowerCase() === lower)
                  const codeMatch = eligibleEmps.find((emp) => (emp.employee_code ?? '').toLowerCase() === lower)
                  let match = exact ?? codeMatch
                  if (!match) {
                    const partial = eligibleEmps.filter((emp) => {
                      const name = `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.toLowerCase()
                      return (emp.employee_code ?? '').toLowerCase().startsWith(lower) || name.includes(lower)
                    })
                    if (partial.length === 1) match = partial[0]
                  }
                  if (match) {
                    onChange({ user_id: match.user_id, department_id: match.department_id })
                  }
                }}
              />
              <datalist id="modal-employee-options">
                {eligibleEmps.map((emp) => (
                  <option key={emp.user_id} value={formatEmployeeOption(emp)} />
                ))}
              </datalist>
            </label>
            <label>
              วันที่จะเข้า
              <input
                type="date"
                lang="en-GB"
                data-date={formatDateInput(form.booking_date?.slice(0, 10) ?? '')}
                data-empty={form.booking_date ? 'false' : 'true'}
                value={form.booking_date?.slice(0, 10) ?? ''}
                onChange={(e) => onChange({ booking_date: e.target.value })}
              />
            </label>
            <label>
              ฝ่ายงาน
              <select value={form.department_id ?? ''} onChange={(e) => onChange({ department_id: e.target.value, seat_id: '' })}>
                <option value="">-- เลือกฝ่ายงาน --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            {seatRequired && (
              <label>
                ที่นั่ง (ฝ่ายนี้ต้องเลือกที่นั่งเฉพาะ)
                <select value={form.seat_id ?? ''} onChange={(e) => onChange({ seat_id: e.target.value })}>
                  <option value="">-- เลือกที่นั่ง --</option>
                  {filteredSeats.map((s) => (
                    <option key={s.id} value={s.id}>{s.seat_code}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              เหตุผลการเข้าออฟฟิศ
              <select value={form.purpose_id ?? ''} onChange={(e) => onChange({ purpose_id: e.target.value })}>
                <option value="">-- เลือกเหตุผล --</option>
                {purposes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label>
              สถานะการจอง
              <select value={form.status ?? 'BOOKED'} onChange={(e) => onChange({ status: e.target.value })}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              บันทึกเพิ่มเติม
              <textarea rows={3} value={form.note ?? ''} onChange={(e) => onChange({ note: e.target.value })} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={onClose}>ยกเลิก</button>
              <button type="submit" className="btn primary">บันทึก</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
