const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Member = require('../models/Member');
const Branch = require('../models/Branch');
const SavingGoal = require('../models/SavingGoal');
const User = require('../models/User');
const SupportTicket = require('../models/SupportTicket');
const FinancialTransaction = require('../models/FinancialTransaction');
const mongoose = require('mongoose');
const { escapeRegExp } = require('../utils/stringUtils');

// @desc    Global search across entities based on role
// @route   GET /api/search
// @access  Private
const globalSearch = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.json({ results: [] });
  }

  try {
    const escapedQ = escapeRegExp(q);
    const searchRegex = new RegExp(escapedQ, 'i');
    const results = [];

    // Determine scope based on user/member auth
    const user = req.user;
    const member = req.member;

    if (user) {
      const isSuperAdmin = user.role === 'super_admin';
      const isAdmin = user.role === 'admin' || isSuperAdmin;
      const branchScope = user.managedBranchId || user.branchId;
      const scope = { user: effectiveOwnerId };
      if (user.role === 'staff') {
        if (branchScope) scope.branchId = branchScope;
      }

      // 1. Search Customers
      const customers = await Customer.find({
        ...scope,
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { cnic: searchRegex },
        ],
      })
        .limit(5)
        .select('name email phone _id');

      customers.forEach((c) =>
        results.push({
          id: c._id,
          title: c.name,
          subtitle: c.email || c.phone,
          type: 'Customer',
          url: `/customers/${c._id}`,
        }),
      );

      // 2. Search Members
      const members = await Member.find({
        ...scope,
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { cnic: searchRegex },
        ],
      })
        .limit(5)
        .select('name email phone _id');

      members.forEach((m) =>
        results.push({
          id: m._id,
          title: m.name,
          subtitle: m.email || m.phone,
          type: 'Member',
          url: `/members/${m._id}`,
        }),
      );

      // 3. Search Loans
      const loans = await Loan.find({
        user: effectiveOwnerId,
        ...(user.role === 'staff' && branchScope
          ? { branchId: branchScope }
          : {}),
        // Most loans index by customer. Let's find customers first if we want branch scoping accurately for loans
      })
        .populate({
          path: 'customer',
          match:
            user.role === 'staff' && branchScope
              ? { branchId: branchScope }
              : {},
        })
        .limit(20); // Fetch more to filter populated

      const filteredLoans = loans
        .filter(
          (l) =>
            l.customer &&
            (l._id.toString().includes(q) ||
              l.customer.name.match(searchRegex)),
        )
        .slice(0, 5);

      filteredLoans.forEach((l) =>
        results.push({
          id: l._id,
          title: `Loan #${l._id.toString().slice(-6).toUpperCase()}`,
          subtitle: l.customer.name,
          type: 'Loan',
          url: `/loans/${l._id}`,
        }),
      );

      // 4. Search Branches (Admin/Super Admin only)
      if (isAdmin) {
        const branches = await Branch.find({
          owner: isSuperAdmin ? user._id : effectiveOwnerId,
          name: searchRegex,
        }).limit(3);

        branches.forEach((b) =>
          results.push({
            id: b._id,
            title: b.name,
            subtitle: b.address,
            type: 'Branch',
            url: `/branches`,
          }),
        );

        // 5. Search Staff/Managers (Users) - Admin/Super Admin only
        const allStaff = await User.find({
          ownerId: isSuperAdmin ? user._id : effectiveOwnerId,
          $or: [{ name: searchRegex }, { email: searchRegex }],
          role: { $in: ['admin', 'staff'] },
        }).limit(10);

        for (const s of allStaff) {
          const managedBranch = await Branch.findOne({ manager: s._id });
          results.push({
            id: s._id,
            title: s.name,
            subtitle: managedBranch
              ? `Manager of ${managedBranch.name}`
              : `${s.email} - ${s.role === 'admin' ? 'Admin' : 'Staff'}`,
            type: managedBranch ? 'Manager' : 'Staff',
            url: managedBranch ? `/branches` : `/staff`,
          });
        }

        // 6. Search Support Tickets - Admin only
        const tickets = await SupportTicket.find({
          subject: searchRegex,
        }).limit(5);

        tickets.forEach((t) =>
          results.push({
            id: t._id,
            title: t.subject,
            subtitle: `Status: ${t.status}`,
            type: 'Support Ticket',
            url: `/tickets/${t._id}`,
          }),
        );

        // 7. Search All Saving Goals - Admin only
        const allGoals = await SavingGoal.find({
          title: searchRegex,
        })
          .populate('member', 'name')
          .limit(5);

        allGoals.forEach((g) =>
          results.push({
            id: g._id,
            title: g.title,
            subtitle: `By: ${g.member?.name || 'Unknown Member'}`,
            type: 'Saving Goal',
            url: `/members`, // Admin usually sees goals in member details
          }),
        );

        // 8. Search Financial Transactions - Admin only
        const transactions = await FinancialTransaction.find({
          user: user._id,
          description: searchRegex,
        }).limit(5);

        transactions.forEach((tx) =>
          results.push({
            id: tx._id,
            title: tx.description || 'Transaction',
            subtitle: `${tx.amount} - ${tx.category}`,
            type: 'Transaction',
            url: `/ledger`,
          }),
        );
      }
    } else if (member) {
      // Member scope
      // 1. Search their own Loans
      const loans = await Loan.find({
        customer: member.customer,
      })
        .populate('customer', 'name')
        .limit(5);

      const filteredLoans = loans.filter(
        (l) =>
          l._id.toString().includes(q) || l.customer.name.match(searchRegex),
      );

      filteredLoans.forEach((l) =>
        results.push({
          id: l._id,
          title: `Your Loan #${l._id.toString().slice(-6).toUpperCase()}`,
          subtitle: `${l.principal} - ${l.status}`,
          type: 'Loan',
          url: `/member/loans`,
        }),
      );

      // 2. Search Saving Goals
      const goals = await SavingGoal.find({
        member: member._id,
        title: searchRegex,
      }).limit(5);

      goals.forEach((g) =>
        results.push({
          id: g._id,
          title: g.title,
          subtitle: `Target: ${g.targetAmount}`,
          type: 'Saving Goal',
          url: `/member/vault`,
        }),
      );
    }

    res.json({ results });
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};

module.exports = {
  globalSearch,
};
