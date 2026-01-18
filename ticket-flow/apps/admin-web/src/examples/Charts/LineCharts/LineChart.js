/*!

=========================================================
* Vision UI Free React - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/vision-ui-free-react
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)
* Licensed under MIT (https://github.com/creativetimofficial/vision-ui-free-react/blob/master LICENSE.md)

* Design and Coded by Simmmple & Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

import React from "react";
import ReactApexChart from "react-apexcharts";

class LineChart extends React.Component {
  constructor(props) {
    super(props);

    // Initialize with safe default values to prevent errors in dev mode
    const { lineChartData, lineChartOptions } = props;
    const safeData = this.validateAndPrepareData(lineChartData, lineChartOptions);

    this.state = {
      chartData: safeData.chartData,
      chartOptions: safeData.chartOptions,
    };
  }

  validateAndPrepareData(lineChartData, lineChartOptions) {
    // Ensure data is valid before setting state
    // ApexCharts expects: [{ name: string, data: number[] }, ...]
    const isValidData = Array.isArray(lineChartData) && 
      lineChartData.length > 0 && 
      lineChartData.every((s) => s && typeof s === 'object' && Array.isArray(s.data) && s.data.length > 0);
    
    const safeChartData = isValidData 
      ? lineChartData 
      : [{ name: "No data", data: [0] }];
    
    // Ensure options have valid structure
    const safeChartOptions = lineChartOptions ? { ...lineChartOptions } : {};
    
    // Fix datetime type issue: if categories are strings, use "category" type, not "datetime"
    if (safeChartOptions.xaxis) {
      safeChartOptions.xaxis = { ...safeChartOptions.xaxis };
      
      // If categories are strings (not timestamps), force type to "category"
      if (safeChartOptions.xaxis.categories && Array.isArray(safeChartOptions.xaxis.categories)) {
        const firstCategory = safeChartOptions.xaxis.categories[0];
        const isStringCategory = typeof firstCategory === 'string' && 
          !firstCategory.match(/^\d+$/) && // not a pure number
          isNaN(Date.parse(firstCategory)); // not a valid date string
        
        if (isStringCategory && safeChartOptions.xaxis.type === 'datetime') {
          safeChartOptions.xaxis.type = 'category';
        }
      }
      
      // Ensure categories array exists and is valid
      if (safeChartOptions.xaxis.categories) {
        if (!Array.isArray(safeChartOptions.xaxis.categories) || safeChartOptions.xaxis.categories.length === 0) {
          safeChartOptions.xaxis.categories = safeChartData[0]?.data?.map((_, i) => `Item ${i + 1}`) || ['No data'];
        }
      }
    }

    return { chartData: safeChartData, chartOptions: safeChartOptions };
  }

  componentDidMount() {
    const { lineChartData, lineChartOptions } = this.props;
    const safeData = this.validateAndPrepareData(lineChartData, lineChartOptions);
    this.setState({
      chartData: safeData.chartData,
      chartOptions: safeData.chartOptions,
    });
  }

  componentDidUpdate(prevProps) {
    // Handle prop changes in dev mode (hot reload)
    if (prevProps.lineChartData !== this.props.lineChartData || 
        prevProps.lineChartOptions !== this.props.lineChartOptions) {
      const { lineChartData, lineChartOptions } = this.props;
      const safeData = this.validateAndPrepareData(lineChartData, lineChartOptions);
      this.setState({
        chartData: safeData.chartData,
        chartOptions: safeData.chartOptions,
      });
    }
  }

  render() {
    const { chartData, chartOptions } = this.state;
    
    // Additional safety check before rendering
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      return null;
    }
    
    // Ensure each series has valid data array
    const hasValidSeries = chartData.every((series) => 
      series && 
      typeof series === 'object' && 
      Array.isArray(series.data) && 
      series.data.length > 0
    );
    
    if (!hasValidSeries) {
      return null;
    }

    return (
      <ReactApexChart
        options={chartOptions}
        series={chartData}
        type="area"
        width="100%"
        height="100%"
      />
    );
  }
}

export default LineChart;
