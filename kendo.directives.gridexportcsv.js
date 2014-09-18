(function(angular) {
    'use strict';
    angular.module('kendo.directives.gridExportCsv', ['kendo.directives'])

    /**    
     * @name kendoCsvExport
     * @desc Exports a CSV from a Kendo UI grid
     * data-kendo-csv-export {clickable element}
     * data-file-name {pre-set exported file name}
     * data-k-target = {target grid id}
     */
    .directive('kendoCsvExport', ['$filter',
        function($filter) {
            return {
                restrict: "A",
                link: function($scope, element, attrs) {
                    var target = attrs.kTarget;
                    if (!target) {
                        throw new Error("Target Grid is missing for export");
                    }

                    element.on('click', function(e) {
                        var d = new Date();
                        var dateFormatted = $filter('date')(d, "yyyy-MM-dd HH_mm_ss");
                        var nameStart = attrs.fileName || 'GridExport';
                        var fileName = nameStart + ' ' + dateFormatted;
                        var csv = '';
                        var grid = $('#' + target).data('kendoGrid'),
                            dataSource = grid.dataSource,
                            filters = dataSource.filter(),
                            sorts = dataSource.sort(),
                            allData = dataSource._data,
                            query = new kendo.data.Query(allData),
                            originalPageSize = dataSource.pageSize,
                            visibleColumns = getVisibleColumns(grid.columns);

                        //apply sorts and filters 
                        if (filters) {
                            query = query.filter(filters);
                        }

                        if (sorts) {
                            query = query.sort(sorts);
                        }
                        var data = query.data;

                        //Increase page size to cover all data
                        dataSource.pageSize = data.length;

                        //First add header row
                        csv += generateHeaderRow(visibleColumns);

                        //Add row data
                        csv += generateRowData(data, visibleColumns);

                        // Reset datasource
                        dataSource.pageSize = originalPageSize;

                        //kickoff download
                        if (window.navigator.msSaveBlob) {
                            window.navigator.msSaveBlob(new Blob([result]), fileName + '.csv');
                        } else {
                            /*
                                The above doesn't seem to work in Chrome/Firefox
                                */
                            var a = document.createElement('a');
                            a.href = 'data:attachment/csv,' + encodeURIComponent(csv);
                            a.target = '_blank';
                            a.download = fileName + '.csv';
                            document.body.appendChild(a);
                            a.click();
                        }
                    });
                }
            };

            function getVisibleColumns(columns) {
                var visibleColumns = [];
                //Get visible columns
                for (var i = 0; i < columns.length; i++) {
                    var title = columns[i].title,
                        hidden = columns[i].hidden,
                        field = columns[i].field;

                    if (typeof(field) === "undefined") {
                        continue; /* no data */
                    }
                    if (hidden) {
                        continue; /* column hidden */
                    }
                    if (typeof(title) === "undefined") {
                        title = field /* use default field name if no title specified */
                    }
                    visibleColumns.push(columns[i])
                }
                return visibleColumns;
            }

            function generateHeaderRow(visibleColumns) {
                var header = '';
                for (var i = 0; i < visibleColumns.length; i++) {
                    var title = visibleColumns[i].title;
                    title = title.replace(/"/g, '""');
                    header += '"' + title + '"';
                    if (i < visibleColumns.length - 1) {
                        header += ",";
                    }
                }
                return header += "\n";
            }

            function generateRowData(data, visibleColumns) {
                //add each row of data        
                var rowData = '';
                for (var row = 0; row < data.length; row++) {
                    for (var i = 0; i < visibleColumns.length; i++) {
                        var fieldName = visibleColumns[i].field,
                            template = visibleColumns[i].template,
                            format = visibleColumns[i].format,
                            template = visibleColumns[i].template,
                            forceText = visibleColumns[i].forceText,
                            ignoreTemplateOnExport = visibleColumns[i].ignoreTemplateOnExport,
                            hidden = visibleColumns[i].hidden;

                        if (typeof(fieldName) === "undefined") {
                            continue;
                        }
                        if (hidden) {
                            continue; /* column hidden */
                        }

                        var value = data[row][fieldName];

                        if (!value) {
                            value = "";
                        } else {
                            if (!format && !template) {
                                value = value.toString();
                            }

                            if (format) {
                                /* apply formatting */
                                value = kendo.format(format, value);
                            }

                            if (template && typeof(template) === "function") {
                                /* apply template function */
                                var kt = template(data[row]);
                                value = ignoreTemplateOnExport ? value.toString() : angular.element(kt)[0].innerText;
                            }

                        }
                        value = value.replace(/"/g, '""');

                        /* 
                         This forces Excel to interpret the data as text. ie: 
                         long numbers that get converted to scientific notation.
                        */
                        rowData += forceText ? '=' : '';

                        rowData += '"' + value + '"';
                        if (i < visibleColumns.length - 1) {
                            rowData += ",";
                        }
                    }
                    //close each row with a newline
                    rowData += "\n";
                }
                return rowData;
            }
        }
    ]);
})(this.angular)