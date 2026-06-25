const AttendanceRecord = require('../models/AttendanceRecord');
const Employee = require('../models/Employee');

const midnight = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

// @desc   Mark (upsert) attendance for an employee on a day
// @route  POST /api/attendance
// @access Private (manage_payroll)
const markAttendance = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const { employeeId, date, status, checkIn, checkOut, hoursWorked, overtime, notes } =
      req.body;
    if (!employeeId || !date) {
      return res.status(400).json({ message: 'employeeId and date are required' });
    }

    const employee = await Employee.findOne({ _id: employeeId, user: ownerId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const record = await AttendanceRecord.findOneAndUpdate(
      { user: ownerId, employee: employee._id, date: midnight(date) },
      {
        $set: {
          branchId: employee.branchId,
          status: status || 'present',
          checkIn: checkIn || '',
          checkOut: checkOut || '',
          hoursWorked: hoursWorked || 0,
          overtime: overtime || 0,
          notes: notes || '',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   List attendance (paginated, filter by employee/date range)
// @route  GET /api/attendance
// @access Private (manage_payroll)
const getAttendance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 31;
    const query = { user: req.user.effectiveOwnerId };
    if (req.query.employeeId) query.employee = req.query.employeeId;
    if (req.query.from || req.query.to) {
      query.date = {};
      if (req.query.from) query.date.$gte = midnight(req.query.from);
      if (req.query.to) query.date.$lte = midnight(req.query.to);
    }
    if (req.user.role === 'staff') {
      const scope = req.user.managedBranchId || req.user.branchId;
      if (scope) query.branchId = scope;
    }

    const totalEntries = await AttendanceRecord.countDocuments(query);
    const data = await AttendanceRecord.find(query)
      .populate('employee', 'name employeeId')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      data,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Bulk-mark attendance for many employees on one date
// @route  POST /api/attendance/bulk
// @access Private (manage_payroll)
const bulkMarkAttendance = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const { date, records } = req.body;
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res
        .status(400)
        .json({ message: 'date and a non-empty records array are required' });
    }

    // Only act on employees that belong to this tenant.
    const ids = records.map((r) => r.employeeId);
    const owned = await Employee.find({ _id: { $in: ids }, user: ownerId }).select(
      '_id branchId',
    );
    const ownedMap = new Map(owned.map((e) => [e._id.toString(), e]));

    const ops = records
      .filter((r) => ownedMap.has(String(r.employeeId)))
      .map((r) => ({
        updateOne: {
          filter: {
            user: ownerId,
            employee: r.employeeId,
            date: midnight(date),
          },
          update: {
            $set: {
              branchId: ownedMap.get(String(r.employeeId)).branchId,
              status: r.status || 'present',
              checkIn: r.checkIn || '',
              checkOut: r.checkOut || '',
              hoursWorked: r.hoursWorked || 0,
              overtime: r.overtime || 0,
              notes: r.notes || '',
            },
          },
          upsert: true,
        },
      }));

    if (ops.length === 0) {
      return res.status(400).json({ message: 'No valid employees in records' });
    }

    const result = await AttendanceRecord.bulkWrite(ops);
    res.status(201).json({
      message: 'Attendance recorded',
      processed: ops.length,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Monthly attendance summary for an employee
// @route  GET /api/attendance/summary/:employeeId
// @access Private (manage_payroll)
const getAttendanceSummary = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const employee = await Employee.findOne({
      _id: req.params.employeeId,
      user: ownerId,
    });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const agg = await AttendanceRecord.aggregate([
      {
        $match: {
          user: employee.user,
          employee: employee._id,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          overtime: { $sum: '$overtime' },
        },
      },
    ]);

    const summary = agg.reduce(
      (acc, a) => ({ ...acc, [a._id]: a.count }),
      { present: 0, absent: 0, late: 0, 'half-day': 0, holiday: 0, leave: 0 },
    );
    const totalOvertime = agg.reduce((sum, a) => sum + (a.overtime || 0), 0);

    res.json({ month, year, summary, totalOvertime });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  markAttendance,
  getAttendance,
  bulkMarkAttendance,
  getAttendanceSummary,
};
