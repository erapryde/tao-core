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
 * @author Jean-Sébastien Conan <jean-sebastien.conan@vesperiagroup.com>
 */
define([
    'jquery',
    'core/promise',
    'core/requireIfExists',
    'tpl!ui/documentViewer/providers/pdfViewer/viewer',
    'tpl!ui/documentViewer/providers/pdfViewer/pdf',
    'tpl!ui/documentViewer/providers/pdfViewer/fallback'
], function ($, Promise, requireIfExists, viewerTpl, pdfTpl, fallbackTpl) {
    'use strict';

    /**
     * Creates a wrapper for PDF.js
     * @param PDFJS
     * @param $element
     * @returns {Object}
     */
    function pdfViewer(PDFJS, $element) {
        var pdfDoc = null;
        var pageNum = 1;
        var pageCount = 1;
        var pageNumPending = null;
        var pageRendering = null;
        var scale = 1;
        var canvas = $element.get(0);
        var ctx = canvas.getContext('2d');
        var pixelWidth = 1;
        var pixelHeight = 1;

        /**
         * Renders a page
         * @param num
         * @returns {Promise}
         */
        function renderPage(num) {
            if (pdfDoc) {
                if (!pageRendering) {
                    pageRendering = pdfDoc.getPage(num)
                        .then(function (page) {
                            var viewport = page.getViewport(scale);
                            var renderContext = {
                                canvasContext: ctx,
                                viewport: viewport
                            };
                            var ratio = (viewport.width / (viewport.height || 1)) || 1;
                            var width, height;

                            if (ratio >= 1) {
                                height = Math.min(pixelHeight, pixelWidth / ratio);
                                width = Math.min(pixelWidth, height * ratio);
                            } else {
                                width = Math.min(pixelWidth, pixelHeight * ratio);
                                height = Math.min(pixelHeight, width / ratio);
                            }
                            $element.width(width).height(height);

                            canvas.width = viewport.width;
                            canvas.height = viewport.height;

                            return page.render(renderContext).promise.then(function() {
                                var nextPage = pageNumPending;
                                pageNumPending = null;
                                pageRendering = null;
                                if (nextPage !== null) {
                                    return renderPage(nextPage);
                                }
                            });
                        });
                } else {
                    pageNumPending = num;
                }
                return pageRendering;
            } else {
                return Promise.resolve(num);
            }
        }

        return {
            /**
             * Loads a PDF document using PDF.js
             * @param {String} url
             * @returns {Promise}
             */
            load: function load(url) {
                return PDFJS.getDocument(url).then(function (pdfDoc_) {
                    pdfDoc = pdfDoc_;
                    pageNum = 1;
                    pageCount = pdfDoc.numPages;
                    return renderPage(pageNum);
                });
            },

            /**
             * Gets the pages count of the current PDF
             * @returns {Number}
             */
            getPageCount: function getPageCount() {
                return pageCount;
            },

            /**
             * Gets the current page number
             * @returns {Number}
             */
            getPage: function getPage() {
                return pageNum;
            },

            /**
             * Changes the current page
             * @param {Number} page
             * @returns {Promise}
             */
            setPage: function setPage(page) {
                page = Math.min(Math.max(1, page || 0), pageCount);
                if (page !== pageNum) {
                    pageNum = page;
                    return renderPage(pageNum);
                }
                return Promise.resolve();
            },

            /**
             * Resize the viewport
             * @param {Number} width
             * @param {Number} height
             * @returns {Promise}
             */
            setSize: function setSize(width, height) {
                if (width !== pixelWidth || height !== pixelHeight) {
                    pixelWidth = width;
                    pixelHeight = height;
                    return renderPage(pageNum);
                }
                return Promise.resolve();
            },

            /**
             * Liberates the resources
             */
            destroy: function destroy() {
                if (pdfDoc) {
                    pdfDoc.destroy();
                }
                pdfDoc = null;
            }
        };
    }

    return {
        /**
         * Gets the template used to render the viewer
         * @returns {Function}
         */
        getTemplate: function getTemplate() {
            return viewerTpl;
        },

        /**
         * Initializes the component
         */
        init: function init() {
            this.controls = {};
            this.pdf = null;
        },

        /**
         * Loads and displays the document
         */
        load: function load() {
            var self = this;
            var enabled = true;

            // will update the displayed page number, and toggle the input enabling
            function updatePageNumber() {
                var page = self.pdf.getPage();
                if (page !== Number(self.controls.pageNum.val())) {
                    self.controls.pageNum.val(page);
                }

                if (enabled && self.pdf.getPageCount() > 1) {
                    self.controls.pageNum.removeAttr('disabled');
                } else {
                    self.controls.pageNum.attr('disabled', true);
                }
            }

            // will toggle the input enabling of the the "Previous" button
            function updatePrevBtn() {
                if (enabled && self.pdf.getPage() > 1) {
                    self.controls.pagePrev.removeAttr('disabled');
                } else {
                    self.controls.pagePrev.attr('disabled', true);
                }
            }

            // will toggle the input enabling of the the "Next" button
            function updateNextBtn() {
                if (enabled && self.pdf.getPage() < self.pdf.getPageCount()) {
                    self.controls.pageNext.removeAttr('disabled');
                } else {
                    self.controls.pageNext.attr('disabled', true);
                }
            }

            // will update the displayed controls according to the current PDF
            function updateControls() {
                updatePrevBtn();
                updateNextBtn();
                updatePageNumber();
            }

            // enable the controls
            function enable() {
                enabled = true;
                updateControls();
            }

            // disable the controls
            function disable() {
                enabled = false;
                self.controls.navigation.attr('disabled', true);
                self.controls.pageNum.attr('disabled', true);
            }

            // go to a particular page
            function jumpPage(page) {
                self.pdf.setPage(page).then(updateControls);
                updateControls();
            }

            // move the current page by step
            function movePage(step) {
                jumpPage(self.pdf.getPage() + step);
            }

            // try to load the  PDF.js lib, otherwise fallback to the browser native handling
            return requireIfExists('pdfjs-dist/build/pdf')
                .then(function (pdfjs) {
                    return new Promise(function (resolve) {
                        var $element = self.getElement();

                        if (pdfjs) {
                            // PDF.js installed
                            $element.html($(pdfTpl()));

                            self.controls = {
                                bar: $element.find('.pdf-bar'),
                                navigation: $element.find('.navigation'),
                                pagePrev: $element.find('[data-control="pdf-page-prev"]'),
                                pageNext: $element.find('[data-control="pdf-page-next"]'),
                                pageNum: $element.find('[data-control="pdf-page-num"]'),
                                pageCount: $element.find('[data-control="pdf-page-count"]'),
                                content: $element.find('[data-control="pdf-content"]')
                            };

                            self.pdf = pdfViewer(pdfjs, self.controls.content);

                            self.setSize($element.width(), $element.height());

                            disable();

                            self.controls.navigation.on('click', function (e) {
                                movePage(Number($(e.target).data('direction')) || 1);
                            });

                            self.controls.pageNum
                                .on('change', function () {
                                    jumpPage(Number(self.controls.pageNum.val()) || self.pdf.getPage());
                                })
                                .on('keydown', function (event) {
                                    switch (event.keyCode) {
                                        case 38:
                                            movePage(1);
                                            event.stopPropagation();
                                            event.preventDefault();
                                            break;

                                        case 40:
                                            movePage(-1);
                                            event.stopPropagation();
                                            event.preventDefault();
                                            break;
                                    }
                                });

                            self.pdf.load(self.getUrl()).then(resolve);
                        } else {
                            // Browser native behavior fallback
                            $element.html($(fallbackTpl()));

                            self.controls = {
                                viewer: $element.find('iframe')
                            };

                            self.setSize($element.width(), $element.height());

                            self.controls.viewer
                                .on('load.provider', resolve)
                                .attr('src', self.getUrl());
                        }
                    });
                })
                .then(function () {
                    var $element = self.getElement();

                    if (self.pdf) {
                        self.controls.pageCount.html(self.pdf.getPageCount());
                        enable();
                    }

                    self.setSize($element.width(), $element.height());
                });
        },

        /**
         * Destroys the component
         */
        unload: function unload() {
            if (this.pdf) {
                this.pdf.destroy();
            }

            if (this.is('rendered')) {
                this.getElement().empty();
            }
            this.controls = {};
            this.pdf = null;
        },

        /**
         * Sets the size of the component
         * @param {Number} width
         * @param {Number} height
         */
        setSize: function setSize(width, height) {
            var contentHeight;

            if (this.pdf) {
                // only adjust the action bar width, and let the PDF viewer manage its size with the remaining space
                contentHeight = height - this.controls.bar.outerHeight();
                this.controls.bar.width(width);
                return this.pdf.setSize(width, contentHeight);
            } else {
                // the browser will adjust the PDF
                this.controls.viewer.width(width).height(height);
            }
        }
    };
});
