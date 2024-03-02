const accessCheck = require('../middlewares/check-access');

module.exports = (router, routes, departmentAccess) => {
    routes.forEach(route => {
        const {
            method,
            path,
            controller,
            middleware = [], 
            options = {}
        } = route;

        // Prepend accessCheck with options to the middleware array
        const allMiddleware = [accessCheck(departmentAccess, options), ...middleware];
        router[method](path, ...allMiddleware, controller);
    });
    return router;
}
