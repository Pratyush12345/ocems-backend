const express = require('express')
const router = express.Router()
const plantController = require('../../controllers/plant/plantController')
const linkedAccountController = require('../../controllers/plant/linkedAccountController')
const defineRoutes = require('../../utils/routeFactory')
const departmentAccess = {
    read: ['Department-Read', 'Department-Write'],
    write: ['Department-Write']
}

router.use('/instrument', require('./instrument'))
router.use('/chamber', require('./chamber'))
router.use('/alert', require('./alert'))
router.use('/sludge', require('./sludge'))

const routes = [
    {
        method: 'get',
        path: '/department',
        controller: plantController.getDepartmentAccess,
    },
    {
        method: 'patch',
        path: '/department/update',
        controller: plantController.updateDepartmentAccess,
    },
    {
        method: 'delete',
        path: '/department/delete',
        controller: plantController.deleteDepartmentAccess,
    },
    {
        method: 'post',
        path: '/create',
        controller: plantController.createPlant,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    },
    {
        method: 'post',
        path: '/create/linkedac',
        controller: linkedAccountController.createLinkedAccount,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    },
    {
        method: 'post',
        path: '/create/stakeholder',
        controller: linkedAccountController.createStakeholder,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    },
    {
        method: 'post',
        path: '/accepttnc',
        controller: linkedAccountController.acceptTnc,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    },
    {
        method: 'post',
        path: '/addBankAccount',
        controller: linkedAccountController.addBankDetails,
        options: {
            isOnlySuperAdminAccessAllowed: true
        }
    }

]

module.exports = defineRoutes(router, routes, departmentAccess)