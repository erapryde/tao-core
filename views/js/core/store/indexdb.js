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
 * Copyright (c) 2016 (original work) Open Assessment Technologies SA ;
 */

/**
 * IndexDB backend of the client store
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
define(['lodash', 'core/promise', 'lib/store/idbstore'], function(_, Promise, IDBStore){
    'use strict';

    /**
     * Prefix all databases
     * @type {String}
     */
    var prefix = 'tao-store-';

    /**
     * Name of the value that contains the last activity timestamp
     * @type {String}
     */
    var timestampKey = '_ts';

    /**
     * Open and access a store
     * @param {String} storeName - the store name to open
     * @returns {Object} the store backend
     * @throws {TypeError} without a storeName
     */
    var indexDbBackend = function indexDbBackend(storeName){

        //keep a ref of the running store
        var innerStore;

        /**
         * Get the store
         * @returns {Promise} with store instance in resolve
         */
        var getStore = function getStore(){
            if(innerStore){
                return Promise.resolve(innerStore);
            }
            return new Promise(function(resolve, reject){
                innerStore = new IDBStore({
                    dbVersion: 1,
                    storeName: storeName,
                    storePrefix : prefix,
                    keyPath: 'key',
                    autoIncrement: true,
                    onStoreReady: function(){
                        // auto closes when the changed version reflects a DB deletion
                        innerStore.db.onversionchange = function (e) {
                            if (!e || !e.newVersion) {
                                innerStore.db.close();
                            }
                        };
                        resolve(innerStore);
                    },
                    onError : reject
                });
            });
        };

        //keep a ref to the promise actually writing
        var writePromise;

        /**
         * Ensure write promises are executed in series
         * @param {Function} getWritingPromise - the function that run the promise
         * @returns {Promise} the original one
         */
        var ensureSerie = function ensureSerie(getWritingPromise){

            //first promise, keep the ref
            if(!writePromise){
                writePromise = getWritingPromise();
                return writePromise;
            }

            //create a wrapping promise
            return new Promise(function(resolve, reject){
                //run the current request
                var runWrite = function(){
                    var p = getWritingPromise();
                    writePromise = p; //and keep the ref
                    p.then(resolve).catch(reject);
                };

                //wait the previous to resolve or fail and run the current one
                writePromise.then(runWrite).catch(runWrite);
            });
        };

        if(_.isEmpty(storeName) || !_.isString(storeName)){
            throw new TypeError('The store name is required');
        }

        /**
         * The store
         */
        return {

            /**
             * Get an item with the given key
             * @param {String} key
             * @returns {Promise} with the result in resolve, undefined if nothing
             */
            getItem : function getItem(key){
                return ensureSerie(function getWritingPromise(){
                    return getStore().then(function(store){
                        return new Promise(function(resolve, reject){
                            var success = function success(entry){
                                if(!entry || !entry.value){
                                    return resolve(entry);
                                }

                                resolve(entry.value);
                            };
                            store.get(key, success, reject);
                        });
                    });
                });
            },

            /**
             * Set an item with the given key
             * @param {String} key - the item key
             * @param {*} value - the item value
             * @returns {Promise} with true in resolve if added/updated
             */
            setItem :  function setItem(key, value){
                return ensureSerie(function getWritingPromise(){
                    return getStore().then(function(store){
                        function setEntry(k, v) {
                            return new Promise(function(resolve, reject){
                                var entry = {
                                    key : k,
                                    value : v
                                };
                                var success = function success(returnKey){
                                    resolve(returnKey === k);
                                };
                                store.put(entry, success, reject);
                            });
                        }

                        return setEntry(key, value).then(function() {
                            return setEntry(timestampKey, Date.now());
                        });
                    });
                });
            },

            /**
             * Get the timestamp of the last activity
             * @returns {Promise} with the result in resolve, undefined if nothing
             */
            getLastActivity : function getLastActivity() {
                return this.getItem(timestampKey);
            },

            /**
             * Remove an item with the given key
             * @param {String} key - the item key
             * @returns {Promise} with true in resolve if removed
             */
            removeItem : function removeItem(key){
                return ensureSerie(function getWritingPromise(){
                    return getStore().then(function(store){
                        return new Promise(function(resolve, reject){
                            var success = function success(result){
                                resolve(result !== false);
                            };
                            store.remove(key, success, reject);
                        });
                    });
                });
            },

            /**
             * Clear the current store
             * @returns {Promise} with true in resolve once cleared
             */
            clear : function clear(){
                return ensureSerie(function getWritingPromise(){
                    return getStore().then(function(store){
                        return new Promise(function(resolve, reject){
                            var success = function success(){
                                resolve(true);
                            };
                            store.clear(success, reject);
                        });
                    });
                });
            },

            /**
             * Delete the database related to the current store
             * @returns {Promise} with true in resolve once cleared
             */
            removeStore : function removeStore() {
                return ensureSerie(function getWritingPromise(){
                    return getStore().then(function(store){
                        return new Promise(function(resolve, reject){
                            var success = function success(){
                                resolve(true);
                            };
                            store.deleteDatabase(success, reject);
                        });
                    });
                });
            }
        };
    };

    return indexDbBackend;
});
