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

import React, { Component } from "react";
import Chart from "react-apexcharts";

class BarChart extends Component {
  constructor(props) {
    super(props);
    
    // Initialize with safe default values to prevent errors in dev mode
    const { barChartData, barChartOptions } = props;
    const safeData = this.validateAndPrepareData(barChartData, barChartOptions);

    this.state = {
      chartData: safeData.chartData,
      chartOptions: safeData.chartOptions,
    };
  }

  validateAndPrepareData(barChartData, barChartOptions) {
    // Ensure data is valid before setting state
    // ApexCharts expects: [{ name: string, data: number[] }, ...]
    const isValidData = Array.isArray(barChartData) && 
      barChartData.length > 0 && 
      barChartData.every((s) => s && typeof s === 'object' && Array.isArray(s.data) && s.data.length > 0);
    
    const safeChartData = isValidData 
      ? barChartData 
      : [{ name: "No data", data: [0] }];
    
    // Ensure options have valid structure
    const safeChartOptions = barChartOptions ? { ...barChartOptions } : {};
    
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
    const { barChartData, barChartOptions } = this.props;
    const safeData = this.validateAndPrepareData(barChartData, barChartOptions);
    this.setState({
      chartData: safeData.chartData,
      chartOptions: safeData.chartOptions,
    });
  }

  componentDidUpdate(prevProps) {
    // Handle prop changes in dev mode (hot reload)
    if (prevProps.barChartData !== this.props.barChartData || 
        prevProps.barChartOptions !== this.props.barChartOptions) {
      const { barChartData, barChartOptions } = this.props;
      const safeData = this.validateAndPrepareData(barChartData, barChartOptions);
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
      <Chart
        options={chartOptions}
        series={chartData}
        type="bar"
        width="100%"
        height="100%"
      />
    );
  }
}

export default BarChart;
