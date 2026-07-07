import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { css } from 'styled-components';
import { NavLink, useLocation } from 'react-router-dom';
import { media } from '../../styles/media';

/* ── LUNO SVG Icons ── */

const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293l6-6zm5-.793V6l-2-2V2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5z" />
    <path opacity="0.5" fillRule="evenodd" d="M7.293 1.5a1 1 0 0 1 1.414 0l6.647 6.646a.5.5 0 0 1-.708.708L8 2.207 1.354 8.854a.5.5 0 1 1-.708-.708L7.293 1.5z" />
  </svg>
);

const IconApps = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5.5 2A3.5 3.5 0 0 0 2 5.5v5A3.5 3.5 0 0 0 5.5 14h5a3.5 3.5 0 0 0 3.5-3.5V8a.5.5 0 0 1 1 0v2.5a4.5 4.5 0 0 1-4.5 4.5h-5A4.5 4.5 0 0 1 1 10.5v-5A4.5 4.5 0 0 1 5.5 1H8a.5.5 0 0 1 0 1H5.5z" />
    <path opacity="0.5" d="M16 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
  </svg>
);

const IconAccount = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" clipRule="evenodd" d="M2 1C1.46957 1 0.960859 1.21071 0.585786 1.58579C0.210714 1.96086 0 2.46957 0 3L0 13C0 13.5304 0.210714 14.0391 0.585786 14.4142C0.960859 14.7893 1.46957 15 2 15H14C14.5304 15 15.0391 14.7893 15.4142 14.4142C15.7893 14.0391 16 13.5304 16 13V3C16 2.46957 15.7893 1.96086 15.4142 1.58579C15.0391 1.21071 14.5304 1 14 1H2ZM1 3C1 2.73478 1.10536 2.48043 1.29289 2.29289C1.48043 2.10536 1.73478 2 2 2H14C14.2652 2 14.5196 2.10536 14.7071 2.29289C14.8946 2.48043 15 2.73478 15 3V13C15 13.2652 14.8946 13.5196 14.7071 13.7071C14.5196 13.8946 14.2652 14 14 14H2C1.73478 14 1.48043 13.8946 1.29289 13.7071C1.10536 13.5196 1 13.2652 1 13V3ZM2 5.5C2 5.36739 2.05268 5.24021 2.14645 5.14645C2.24021 5.05268 2.36739 5 2.5 5H6C6.13261 5 6.25979 5.05268 6.35355 5.14645C6.44732 5.24021 6.5 5.36739 6.5 5.5C6.5 5.63261 6.44732 5.75979 6.35355 5.85355C6.25979 5.94732 6.13261 6 6 6H2.5C2.36739 6 2.24021 5.94732 2.14645 5.85355C2.05268 5.75979 2 5.63261 2 5.5ZM2 8.5C2 8.36739 2.05268 8.24021 2.14645 8.14645C2.24021 8.05268 2.36739 8 2.5 8H6C6.13261 8 6.25979 8.05268 6.35355 8.14645C6.44732 8.24021 6.5 8.36739 6.5 8.5C6.5 8.63261 6.44732 8.75979 6.35355 8.85355C6.25979 8.94732 6.13261 9 6 9H2.5C2.36739 9 2.24021 8.94732 2.14645 8.85355C2.05268 8.75979 2 8.63261 2 8.5ZM2 10.5C2 10.3674 2.05268 10.2402 2.14645 10.1464C2.24021 10.0527 2.36739 10 2.5 10H6C6.13261 10 6.25979 10.0527 6.35355 10.1464C6.44732 10.2402 6.5 10.3674 6.5 10.5C6.5 10.6326 6.44732 10.7598 6.35355 10.8536C6.25979 10.9473 6.13261 11 6 11H2.5C2.36739 11 2.24021 10.9473 2.14645 10.8536C2.05268 10.7598 2 10.6326 2 10.5Z" />
    <path opacity="0.5" d="M8.5 11C8.5 11 8 11 8 10.5C8 10 8.5 8.5 11 8.5C13.5 8.5 14 10 14 10.5C14 11 13.5 11 13.5 11H8.5ZM11 8C11.3978 8 11.7794 7.84196 12.0607 7.56066C12.342 7.27936 12.5 6.89782 12.5 6.5C12.5 6.10218 12.342 5.72064 12.0607 5.43934C11.7794 5.15804 11.3978 5 11 5C10.6022 5 10.2206 5.15804 9.93934 5.43934C9.65804 5.72064 9.5 6.10218 9.5 6.5C9.5 6.89782 9.65804 7.27936 9.93934 7.56066C10.2206 7.84196 10.6022 8 11 8V8Z" />
  </svg>
);

const IconTransactions = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M0 3H16V4H0V3Z" />
    <path d="M9 1H14V6H9V1Z" />
    <path d="M0 13H16V14H0V13Z" />
    <path d="M9 11H14V16H9V11Z" />
    <path opacity="0.5" d="M0 8H16V9H0V8Z" />
    <path opacity="0.5" d="M2 6H7V11H2V6Z" />
  </svg>
);

const IconPortfolio = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path opacity="0.5" d="M6.5 1C6.10218 1 5.72064 1.15804 5.43934 1.43934C5.15804 1.72064 5 2.10218 5 2.5V3H1.5C1.10218 3 0.720644 3.15804 0.43934 3.43934C0.158035 3.72064 0 4.10218 0 4.5L0 5.884L7.614 7.914C7.86693 7.98135 8.13307 7.98135 8.386 7.914L16 5.884V4.5C16 4.10218 15.842 3.72064 15.5607 3.43934C15.2794 3.15804 14.8978 3 14.5 3H11V2.5C11 2.10218 10.842 1.72064 10.5607 1.43934C10.2794 1.15804 9.89782 1 9.5 1H6.5ZM6.5 2H9.5C9.63261 2 9.75979 2.05268 9.85355 2.14645C9.94732 2.24021 10 2.36739 10 2.5V3H6V2.5C6 2.36739 6.05268 2.24021 6.14645 2.14645C6.24021 2.05268 6.36739 2 6.5 2Z" />
    <path d="M0 13.5C0 13.8978 0.158035 14.2793 0.43934 14.5606C0.720644 14.8419 1.10218 15 1.5 15H14.5C14.8978 15 15.2794 14.8419 15.5607 14.5606C15.842 14.2793 16 13.8978 16 13.5V6.84998L8.129 8.94698C8.04448 8.96955 7.95552 8.96955 7.871 8.94698L0 6.84998V13.5Z" />
  </svg>
);

const IconCoin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M10.5 14C11.4283 14 12.3185 13.6313 12.9749 12.9749C13.6313 12.3185 14 11.4283 14 10.5L14 5.5C14 4.57174 13.6313 3.6815 12.9749 3.02513C12.3185 2.36875 11.4283 2 10.5 2L5.5 2C4.57174 2 3.6815 2.36875 3.02513 3.02513C2.36875 3.6815 2 4.57174 2 5.5L2 8C2 8.13261 1.94732 8.25979 1.85355 8.35355C1.75979 8.44732 1.63261 8.5 1.5 8.5C1.36739 8.5 1.24021 8.44732 1.14645 8.35355C1.05268 8.25979 1 8.13261 1 8L1 5.5C1 4.30653 1.47411 3.16193 2.31802 2.31802C3.16193 1.47411 4.30652 1 5.5 1L10.5 1C11.6935 1 12.8381 1.47411 13.682 2.31802C14.5259 3.16193 15 4.30653 15 5.5L15 10.5C15 11.6935 14.5259 12.8381 13.682 13.682C12.8381 14.5259 11.6935 15 10.5 15L10 15C9.86739 15 9.74021 14.9473 9.64645 14.8536C9.55268 14.7598 9.5 14.6326 9.5 14.5C9.5 14.3674 9.55268 14.2402 9.64645 14.1464C9.74021 14.0527 9.86739 14 10 14L10.5 14Z" />
    <path opacity="0.5" d="M4.70156 13.8462V14.8077C4.70156 14.9138 4.78633 15 4.89079 15H5.64771C5.69789 15 5.74603 14.9797 5.78151 14.9437C5.817 14.9076 5.83694 14.8587 5.83694 14.8077V13.8462H6.2154V14.8077C6.2154 14.9138 6.30017 15 6.40463 15H7.16155C7.21174 15 7.25987 14.9797 7.29535 14.9437C7.33084 14.9076 7.35078 14.8587 7.35078 14.8077V13.8462H7.41436C8.92215 13.8462 10 13.0515 10 11.6769C10 10.5215 9.23778 9.89 8.34537 9.8V9.73231C9.07958 9.54615 9.61927 8.98308 9.61927 8.04769C9.61927 6.86923 8.74881 6.15385 7.42042 6.15385H7.35078V5.19231C7.35078 5.1413 7.33084 5.09239 7.29535 5.05633C7.25987 5.02026 7.21174 5 7.16155 5H6.40463C6.35444 5 6.30631 5.02026 6.27082 5.05633C6.23533 5.09239 6.2154 5.1413 6.2154 5.19231V6.15385H5.78168V5.19231C5.78168 5.1413 5.76175 5.09239 5.72626 5.05633C5.69077 5.02026 5.64264 5 5.59245 5H4.89079C4.8406 5 4.79247 5.02026 4.75698 5.05633C4.72149 5.09239 4.70156 5.1413 4.70156 5.19231V6.15385L3.18923 6.16231C3.13904 6.16231 3.09091 6.18257 3.05542 6.21863C3.01994 6.2547 3 6.30361 3 6.35462V7.11538C3 7.22077 3.08326 7.30769 3.18772 7.30769L3.75919 7.30385C3.9091 7.30486 4.05252 7.36609 4.15816 7.47418C4.26381 7.58226 4.3231 7.72842 4.3231 7.88077V12.1154C4.3231 12.2684 4.26329 12.4151 4.15682 12.5233C4.05036 12.6315 3.90597 12.6923 3.75541 12.6923L3.18923 12.7008C3.13904 12.7008 3.09091 12.721 3.05542 12.7571C3.01994 12.7932 3 12.8421 3 12.8931V13.6623C3 13.7685 3.08478 13.8546 3.18923 13.8546L4.70156 13.8462Z" />
  </svg>
);

const IconMarket = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M1 11C1 10.7348 1.10536 10.4804 1.29289 10.2929C1.48043 10.1054 1.73478 10 2 10H4C4.26522 10 4.51957 10.1054 4.70711 10.2929C4.89464 10.4804 5 10.7348 5 11V14C5 14.2652 4.89464 14.5196 4.70711 14.7071C4.51957 14.8946 4.26522 15 4 15H2C1.73478 15 1.48043 14.8946 1.29289 14.7071C1.10536 14.5196 1 14.2652 1 14V11ZM6 7C6 6.73478 6.10536 6.48043 6.29289 6.29289C6.48043 6.10536 6.73478 6 7 6H9C9.26522 6 9.51957 6.10536 9.70711 6.29289C9.89464 6.48043 10 6.73478 10 7V14C10 14.2652 9.89464 14.5196 9.70711 14.7071C9.51957 14.8946 9.26522 15 9 15H7C6.73478 15 6.48043 14.8946 6.29289 14.7071C6.10536 14.5196 6 14.2652 6 14V7Z" />
    <path opacity="0.5" d="M11.2929 1.29289C11.1054 1.48043 11 1.73478 11 2V14C11 14.2652 11.1054 14.5196 11.2929 14.7071C11.4804 14.8946 11.7348 15 12 15H14C14.2652 15 14.5196 14.8946 14.7071 14.7071C14.8946 14.5196 15 14.2652 15 14V2C15 1.73478 14.8946 1.48043 14.7071 1.29289C14.5196 1.10536 14.2652 1 14 1H12C11.7348 1 11.4804 1.10536 11.2929 1.29289Z" />
  </svg>
);

const IconBankAccounts = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" clipRule="evenodd" d="M2 1C1.46957 1 0.960859 1.21071 0.585786 1.58579C0.210714 1.96086 0 2.46957 0 3L0 13C0 13.5304 0.210714 14.0391 0.585786 14.4142C0.960859 14.7893 1.46957 15 2 15H14C14.5304 15 15.0391 14.7893 15.4142 14.4142C15.7893 14.0391 16 13.5304 16 13V3C16 2.46957 15.7893 1.96086 15.4142 1.58579C15.0391 1.21071 14.5304 1 14 1H2ZM1 3C1 2.73478 1.10536 2.48043 1.29289 2.29289C1.48043 2.10536 1.73478 2 2 2H14C14.2652 2 14.5196 2.10536 14.7071 2.29289C14.8946 2.48043 15 2.73478 15 3V13C15 13.2652 14.8946 13.5196 14.7071 13.7071C14.5196 13.8946 14.2652 14 14 14H2C1.73478 14 1.48043 13.8946 1.29289 13.7071C1.10536 13.5196 1 13.2652 1 13V3Z" />
    <path opacity="0.5" d="M8.5 11C8.5 11 8 11 8 10.5C8 10 8.5 8.5 11 8.5C13.5 8.5 14 10 14 10.5C14 11 13.5 11 13.5 11H8.5ZM11 8C11.3978 8 11.7794 7.84196 12.0607 7.56066C12.342 7.27936 12.5 6.89782 12.5 6.5C12.5 6.10218 12.342 5.72064 12.0607 5.43934C11.7794 5.15804 11.3978 5 11 5C10.6022 5 10.2206 5.15804 9.93934 5.43934C9.65804 5.72064 9.5 6.10218 9.5 6.5C9.5 6.89782 9.65804 7.27936 9.93934 7.56066C10.2206 7.84196 10.6022 8 11 8V8Z" />
  </svg>
);

const IconShield = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5.338 1.59C4.386 1.852 3.44 2.138 2.501 2.446a.543.543 0 0 0-.328.39C1.619 6.993 2.899 10.026 4.426 12.024a13.2 13.2 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.55.55 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.289.893-.533a13.2 13.2 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.543.543 0 0 0-.328-.39 30 30 0 0 0-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.222-2.662.523zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a14.2 14.2 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.268-.829.268s-.548-.136-.829-.268a7 7 0 0 1-1.048-.625 14.2 14.2 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 30 30 0 0 1 5.072.56z" />
    <path opacity="0.5" d="M8 5.385c.212 0 .416.081.566.225.15.144.234.34.234.544v.384H7.2v-.384c0-.204.084-.4.234-.544A.79.79 0 0 1 8 5.385zM9.2 6.538v-.384c0-.306-.126-.6-.352-.816A1.18 1.18 0 0 0 8 5c-.318 0-.624.122-.848.338a1.15 1.15 0 0 0-.352.816v.384c-.212 0-.416.081-.566.225a.77.77 0 0 0-.234.545v1.923c0 .204.084.4.234.544.15.144.354.225.566.225h2.4c.212 0 .416-.081.566-.225a.77.77 0 0 0 .234-.544V7.308a.77.77 0 0 0-.234-.545.79.79 0 0 0-.566-.225z" />
  </svg>
);

const IconDocs = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path opacity="0.5" d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
    <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" />
    <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z" />
  </svg>
);

const IconChangelog = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path opacity="0.5" d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" />
    <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z" />
  </svg>
);

const IconSchedule = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path opacity="0.5" d="M10.854 8.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708 0z" />
    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM2 2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H2z" />
    <path opacity="0.5" d="M2.5 4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V4z" />
  </svg>
);

const IconNotes = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path opacity="0.5" d="M1.5 0A1.5 1.5 0 0 0 0 1.5V13a1 1 0 0 0 1 1V1.5a.5.5 0 0 1 .5-.5H14a1 1 0 0 0-1-1H1.5z" />
    <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v11A1.5 1.5 0 0 0 3.5 16h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 16 9.586V3.5A1.5 1.5 0 0 0 14.5 2h-11zM3 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V9h-4.5A1.5 1.5 0 0 0 9 10.5V15H3.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V10.5a.5.5 0 0 1 .5-.5h4.293L10 14.793z" />
  </svg>
);

/* ── CMS Icons ── */

const IconLeads = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M7 14s-1 0-1-.5.5-2 3-2 3 1.5 3 2-.5.5-.5.5H7zm3-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    <path opacity="0.5" d="M2 14s-1 0-1-.5.5-2 3-2c.87 0 1.47.18 1.9.43A2.5 2.5 0 0 0 5 13.5c0 .28.1.5.1.5H2zM5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    <path d="M14.5 3h-4a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1zm0 2h-4a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1zm-6-2h-1a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1zm0 2h-1a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1z" />
  </svg>
);

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
  </svg>
);

const IconEmailQueue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z" />
  </svg>
);

const IconTasks = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z" />
    <path opacity="0.5" d="M10.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 8.793l2.646-2.647a.5.5 0 0 1 .708 0z" />
  </svg>
);

const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M15 14s1 0 1-.5-1-2-4-2-4 1.5-4 2 1 .5 1 .5h6zm-7.995-.944v-.002.002zM12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    <path opacity="0.5" d="M5.5 14H7c0-.169.01-.339.032-.5H2c.003-.244.085-.986.573-1.706C3.09 11.092 4.224 10.5 6 10.5c.693 0 1.267.098 1.735.266a3.48 3.48 0 0 1 1.07-.666A5.77 5.77 0 0 0 6 9.5c-3 0-4 1.5-4 2s1 .5 1 .5h2.5zM6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
  </svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
    <path opacity="0.5" d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z" />
  </svg>
);

const IconAgent = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Z" />
    <path opacity="0.5" d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0 1 1h1v.938l.4 5.05a1.5 1.5 0 0 0 1.493 1.362h6.214a1.5 1.5 0 0 0 1.493-1.362l.4-5.05V9h1a1 1 0 0 0 1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866Z" />
  </svg>
);

const IconSignOut = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M7.5 1v7h1V1h-1z" />
    <path opacity="0.5" d="M3 8.812a4.999 4.999 0 0 1 2.578-4.375l-.485-.874A6 6 0 1 0 14 8a6 6 0 0 0-4.907-5.437l-.485.874A4.999 4.999 0 0 1 13 8.812 5 5 0 1 1 3 8.812z" />
  </svg>
);

const IconArrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="10" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
  </svg>
);

/* ── Styled Components ── */

/* Hide text labels when sidebar is collapsed (tablet or manual collapse) */
const collapsedHide = css`
  [data-collapsed="true"] & {
    display: none;
  }
`;

/* Scrollable menu area — scrollbar hidden until sidebar hover */
const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 0 8px 8px;
  /* webkit-only: Chrome 149 ignores ::-webkit-scrollbar when scrollbar-width is set */
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.canvas};
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.mode === 'dark' ? '#475569' : 'rgba(0,0,0,0.25)'};
    border-radius: 3px;
  }

  [data-collapsed="true"] & {
    padding: 0 0 8px 4px;
  }
`;

const Wrapper = styled.aside<{ $mobileOpen?: boolean; $collapsed?: boolean }>`
  position: sticky;
  top: 0;
  width: 100%;
  background: ${({ theme }) => theme.colors.canvas};
  border: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  height: 100vh;

  /* White overlay hides scrollbar thumb; stops before FooterLinks so gap is consistent */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 5px;
    bottom: 51px;
    background: ${({ theme }) => theme.colors.canvas};
    pointer-events: none;
    transition: opacity 0.4s ease;
    z-index: 2;
  }
  &:hover::after {
    opacity: 0;
  }

  ${media.mobile} {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    width: 260px;
    height: 100vh;
    transform: translateX(${({ $mobileOpen }) => ($mobileOpen ? '0' : '-100%')});
    transition: transform 0.25s ease;
    box-shadow: ${({ $mobileOpen }) => ($mobileOpen ? '4px 0 20px rgba(0,0,0,0.15)' : 'none')};
    background: ${({ theme }) => theme.colors.canvas};
  }

  ${({ $collapsed }) => $collapsed && css`
    padding: 0 4px 8px;
    align-items: center;
    background: ${({ theme }: any) => theme.colors.canvas};
  `}
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 12px 0 8px;
  flex-shrink: 0;

  [data-collapsed="true"] & {
    display: none;
  }
`;

const SidebarTitle = styled.h4`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.5rem;
  font-weight: 400;
  letter-spacing: 1.5px;
  color: ${({ theme }) => theme.colors.textPrimary};
  flex: 1;
  ${collapsedHide}
`;

const ProjectSelect = styled.div`
  display: flex;
  gap: 8px;
  padding: 0 4px;
  margin-bottom: 12px;
  ${collapsedHide}
`;

const Select = styled.select`
  flex: 1;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.blue}; }
`;

const PlusBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--primary, #2563eb);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { opacity: 0.9; }
`;

const MenuList = styled.ul`
  list-style: none;
  margin: 4px 6px 4px 8px;
  padding: 0;
  border: 1.5px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: 8px;

  & > li + li {
    border-top: 1.5px dashed ${({ theme }) => theme.colors.borderStrong};
  }

  [data-collapsed="true"] & {
    margin: 4px 2px;
    border: none;

    & > li + li {
      border-top: none;
    }
  }
`;

const Divider = styled.li`
  padding: 8px 10px 4px;
  line-height: 1.3;

  [data-collapsed="true"] & {
    padding: 8px 4px 4px;
  }
`;

const DividerLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.textPrimary};
  ${collapsedHide}
`;

const DividerSmall = styled.small`
  display: block;
  font-size: 0.625rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-top: 2px;
  ${collapsedHide}
`;

const MLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }

  &.active {
    color: var(--primary, #2563eb);
    font-weight: 600;
  }

  [data-collapsed="true"] & {
    justify-content: center;
    padding: 10px 4px;
    span { display: none; }
  }
`;

const MLinkButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9375rem;
  color: ${({ theme, $active }) => $active ? 'var(--primary, #2563eb)' : theme.colors.textPrimary};
  font-weight: ${({ $active }) => $active ? 600 : 400};
  text-decoration: none;
  transition: all 0.15s ease;
  background: none;
  border: none;
  width: 100%;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }

  [data-collapsed="true"] & {
    justify-content: center;
    padding: 10px 4px;
    span { display: none; }
  }
`;

const ArrowIcon = styled.span<{ $open: boolean }>`
  margin-left: auto;
  display: inline-flex;
  transition: transform 0.2s ease;
  transform: rotate(${({ $open }) => $open ? '90deg' : '0deg'});
  color: ${({ theme }) => theme.colors.textTertiary};
  ${collapsedHide}
`;

const SubMenu = styled.ul<{ $open: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
  max-height: ${({ $open }) => $open ? '600px' : '0'};
  transition: max-height 0.3s ease;
  ${collapsedHide}
`;

const SubLink = styled(NavLink)`
  display: block;
  padding: 6px 12px 6px 38px;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-decoration: none;
  transition: color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  &.active {
    color: var(--primary, #2563eb);
    font-weight: 500;
  }
`;

const Badge = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  background: var(--primary, #2563eb);
  color: #fff;
  padding: 1px 7px;
  border-radius: 20px;
  margin-left: auto;
  ${collapsedHide}
`;

const FooterLinks = styled.ul`
  list-style: none;
  margin: 0;
  padding: 8px 8px;
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin-top: auto;

  /* Collapsed sidebar → stack vertically */
  [data-collapsed="true"] & {
    flex-direction: column;
    align-items: center;
    padding: 6px 4px;
    gap: 2px;
  }

  ${media.mobile} {
    padding: 10px 12px;
    gap: 8px;
  }
`;

const FooterItem = styled.li`
  flex: 1;
  text-align: center;

  [data-collapsed="true"] & {
    flex: none;
    width: 100%;
  }
`;

const FooterBtn = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 8px;
  color: ${({ theme }) => theme.colors.textTertiary};
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.15s;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }

  ${media.mobile} {
    padding: 10px;
    svg {
      width: 20px;
      height: 20px;
    }
  }

  [data-collapsed="true"] & {
    padding: 10px 4px;
  }
`;

/* ── Component ── */

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose, collapsed = false }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    applications: location.pathname.startsWith('/app-'),
    account: location.pathname.startsWith('/account'),
    auth: false,
    cms: location.pathname.startsWith('/cms-'),
  });

  /* Auto-close mobile drawer on any route change */
  useEffect(() => {
    if (mobileOpen && onMobileClose) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggle = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Wrapper $mobileOpen={mobileOpen} $collapsed={collapsed && !mobileOpen} data-collapsed={collapsed && !mobileOpen ? 'true' : undefined}>
      <ScrollArea>
      {/* Title */}
      <TitleRow>
        <SidebarTitle>
          MAD MAD CMS
        </SidebarTitle>
      </TitleRow>

      {/* MAIN section */}
      <MenuList>
        <Divider>
          <DividerLabel>{t('nav.main')}</DividerLabel>
          <DividerSmall>{t('nav.uniqueDashboards')}</DividerSmall>
        </Divider>
        <li>
          <MLink to="/dashboard"><IconHome /><span>{t('nav.myDashboard')}</span></MLink>
        </li>
        <li>
          <MLink to="/app-calendar"><IconSchedule /><span>{t('nav.calendar')}</span></MLink>
        </li>
      </MenuList>

      {/* CMS section */}
      <MenuList>
        <Divider>
          <DividerLabel>{t('nav.cms')}</DividerLabel>
          <DividerSmall>{t('nav.cmsDesc')}</DividerSmall>
        </Divider>
        <li><MLink to="/cms-search"><IconSearch /><span>{t('nav.leadSearch')}</span></MLink></li>
        <li><MLink to="/cms-leads"><IconLeads /><span>{t('nav.leadPool')}</span></MLink></li>
        <li><MLink to="/cms-tasks"><IconTasks /><span>{t('nav.workflows')}</span></MLink></li>
        <li><MLink to="/cms-agents"><IconAgent /><span>{t('nav.agents')}</span></MLink></li>
        <li><MLink to="/cms-users"><IconUsers /><span>{t('nav.team')}</span></MLink></li>
        <li><MLink to="/cms-settings"><IconSettings /><span>{t('nav.settings')}</span></MLink></li>
      </MenuList>
      </ScrollArea>

      {/* Footer icons */}
      <FooterLinks>
        <FooterItem>
          <FooterBtn title={t('nav.mySchedule')}><IconSchedule /></FooterBtn>
        </FooterItem>
        <FooterItem>
          <FooterBtn title={t('nav.myNotes')}><IconNotes /></FooterBtn>
        </FooterItem>
        <FooterItem>
          <FooterBtn title={t('nav.signOut')}><IconSignOut /></FooterBtn>
        </FooterItem>
      </FooterLinks>
    </Wrapper>
  );
};

export { Sidebar };
export default Sidebar;
