/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2017 (original work) Open Assessment Technologies SA ;
 */
/**
 * @author Jean-Sébastien Conan <jean-sebastien@taotesting.com>
 */
define([
    'jquery',
    'core/historyRouter',
    'core/logger',
    'core/eventifier',
    'core/statifier',
    'util/url',
    'ui/feedback'
], function ($, historyRouterFactory, loggerFactory, eventifier, statifier, urlUtil, feedback) {
    'use strict';

    /**
     * Shared router that will manage the page for each controller
     * @type {historyRouter}
     */
    var historyRouter;

    /**
     * Creates a logger for the app
     */
    var appLogger = loggerFactory('application');

    /**
     * Defines an application  controller that will manage the routes through the history.
     * It will start by dispatching the current location, in order to keep history consistency.
     * To properly use this application controller you need to take care of it in each controller
     * that is intended to be routed through the history. See samples below.
     *
     * @example
     *  // Defines a controller that is routable through the history
     *  return {
     *      // Will be called each time the history routes the action to this controller
     *      start: function start() {
     *          // Take care of the application controller. If the current controller is the entry point, we first
     *          // need to wait for the history to dispatch the action, otherwise the controller will be called twice.
     *          if (!appController.getState('dispatching')) {
     *              return appController.start();
     *          }
     *
     *          // Do the stuff of the controller
     *          ...
     *
     *          // You can also be notified of a change in the route,
     *          // and release some resources as this controller will be destroyed.
     *          // Pay attention to the event namespace, it must be unique.
     *          appController.on('change.myController', function() {
     *              // Release the event, as this controller will be destroyed
     *              appController.off('change.myController');
     *
     *              // Release resources
     *              ...
     *          });
     *  };
     *
     * @typedef {appController}
     */
    var appController = eventifier(statifier({
        /**
         * App controller entry point: set up the router.
         */
        start: function start() {
            // all links that are tagged with the "router" class are dispatched using the history router
            appController.apply();

            // dispatch the current route
            appController.forward(window.location + '');
        },

        /**
         * Catch all links below the target, when they have the provided selector,
         * then dispatch them using the history router.
         * @param {String} [selector] - The CSS signature of links to catch (default: ".router")
         * @param {String|HTMLElement|jQuery} [target] - The container from which catch links (default: document)
         */
        apply: function apply(selector, target) {
            selector = selector || '.router';
            target = target || document;

            $(target).off('click.appController').on('click.appController', selector, function (e) {
                var $elt, href;

                // prevent the browser to actually change the page from this link
                e.preventDefault();

                // try to get the target of the link
                $elt = $(this);
                href = $elt.attr('href');
                if (!href) {
                    href = $('[href]:first-child', $elt).attr('href');
                }

                // use the history router to change the current view
                // the called controller will have in charge to get the data and update the view accordingly
                if (href) {
                    appController.redirect(href);
                }
            });
        },

        /**
         * Redirects the page to another controller
         * @param {String} url
         */
        redirect: function redirect(url) {
            historyRouter.trigger('dispatch', url);
        },

        /**
         * Forwards to another controller
         * @param {String} url
         */
        forward: function forward(url) {
            historyRouter.dispatch({
                url: url
            }, true);
        },

        /**
         * Exposes the router so other controllers can dispatch a route
         *
         * @returns {router} the router
         */
        getRouter: function getRouter() {
            return historyRouter;
        },

        /**
         * Exposes the logger so other controllers can log application level events
         *
         * @returns {logger} the router
         */
        getLogger: function getLogger() {
            return appLogger;
        },

        /**
         * Catches errors
         * @param {Object} err
         */
        onError: function onError(err) {
            var message = err && err.message || err;
            appLogger.error(err);
            feedback().error(message);
        }
    }));

    // setup the history router
    historyRouter = historyRouterFactory()
        .on('dispatching', function (url) {
            appController.setState('dispatching');
            appController.trigger('change', url);
        })
        .on('dispatched', function (url) {
            appController.setState('dispatching', false);
            appController.setState('ready');
            appController.trigger('started', url);
        });

    return appController;
});
