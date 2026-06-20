/**
 * ofxBanks.ts
 *
 * Database of US banks that support OFX Direct Connect.
 * Data sourced from OFX Home (ofxhome.com) and public bank documentation.
 *
 * Fields:
 *   name   — Display name
 *   ofxUrl — Bank's OFX server endpoint
 *   org    — OFX organization identifier
 *   fid    — OFX financial institution ID
 */

export interface OFXBank {
  name: string;
  ofxUrl: string;
  org: string;
  fid: string;
}

export const OFX_BANKS: OFXBank[] = [
  // ── Major Banks ──────────────────────────────────────────────────────────
  {
    name: 'Bank of America',
    ofxUrl: 'https://eftx.bankofamerica.com/eftxweb/access.ofx',
    org: 'HAN',
    fid: '5959',
  },
  {
    name: 'US Bank',
    ofxUrl: 'https://www.oasis.cfree.com/fip/genesis/prod/04950.ofx',
    org: 'US Bank',
    fid: '1401',
  },
  {
    name: 'PNC Bank',
    ofxUrl: 'https://www.oasis.cfree.com/fip/genesis/prod/04841.ofx',
    org: 'PNC',
    fid: '4501',
  },
  {
    name: 'TD Bank',
    ofxUrl: 'https://onlinebanking.tdbank.com/Scripts/serverext.dll',
    org: 'td',
    fid: '1001',
  },
  {
    name: 'USAA Federal Savings',
    ofxUrl: 'https://service2.usaa.com/ofx/OFXServlet',
    org: 'USAA',
    fid: '24591',
  },
  {
    name: 'Navy Federal Credit Union',
    ofxUrl: 'https://imm.navyfederal.org/OFXServer/ofxsrvr.dll',
    org: 'Navy Federal',
    fid: '11075',
  },
  {
    name: 'Charles Schwab',
    ofxUrl: 'https://ofx.schwab.com/cgi_dev/ofx_server',
    org: 'ISC',
    fid: '5104',
  },
  {
    name: 'Fidelity Investments',
    ofxUrl: 'https://ofx.fidelity.com/ftgw/OFX/clients/download',
    org: 'fidelity.com',
    fid: '7776',
  },
  {
    name: 'Vanguard',
    ofxUrl: 'https://vesnc.vanguard.com/us/OfxDirectConnectServlet',
    org: 'Vanguard',
    fid: '1358',
  },
  {
    name: 'E*TRADE',
    ofxUrl: 'https://ofx.etrade.com/cgi-ofx/etradeofx',
    org: 'E*TRADE',
    fid: '9999',
  },

  // ── Regional Banks ───────────────────────────────────────────────────────
  {
    name: 'Ally Bank',
    ofxUrl: 'https://ofx.ally.com/ofx/ofx.html',
    org: 'Ally',
    fid: '11176',
  },
  {
    name: 'Capital One 360',
    ofxUrl: 'https://ofx.capitalone360.com/OFX/ofx.html',
    org: 'ING DIRECT',
    fid: '031176110',
  },
  {
    name: 'Discover Bank',
    ofxUrl: 'https://ofx.discovercard.com',
    org: 'Discover Financial Services',
    fid: '7101',
  },
  {
    name: 'American Express',
    ofxUrl: 'https://online.americanexpress.com/myca/ofxdl/desktop/desktopDownload.do?request_type=nl_ofxdownload',
    org: 'AMEX',
    fid: '3101',
  },
  {
    name: 'BB&T (now Truist)',
    ofxUrl: 'https://eftx.bbt.com/eftxweb/access.ofx',
    org: 'BB&T',
    fid: 'BB&T',
  },
  {
    name: 'SunTrust (now Truist)',
    ofxUrl: 'https://www.oasis.cfree.com/fip/genesis/prod/04843.ofx',
    org: 'SunTrust',
    fid: '4843',
  },
  {
    name: 'Fifth Third Bank',
    ofxUrl: 'https://banking.fifththird.com/olbWeb/OFXServlet',
    org: '5829',
    fid: '5829',
  },
  {
    name: 'Regions Bank',
    ofxUrl: 'https://ofx.regions.com/ofx/ofx.html',
    org: 'Regions Bank',
    fid: '243083237',
  },
  {
    name: 'KeyBank',
    ofxUrl: 'https://www.oasis.cfree.com/fip/genesis/prod/04801.ofx',
    org: 'KeyBank',
    fid: '4801',
  },
  {
    name: 'M&T Bank',
    ofxUrl: 'https://ofx.mtb.com/ofxweb/access.ofx',
    org: 'M&T Bank',
    fid: '1301',
  },
  {
    name: 'Huntington Bank',
    ofxUrl: 'https://onlinebanking.huntington.com/scripts/serverext.dll',
    org: 'Huntington',
    fid: '3701',
  },
  {
    name: 'Citizens Bank',
    ofxUrl: 'https://www.oasis.cfree.com/fip/genesis/prod/04831.ofx',
    org: 'Citizens Bank',
    fid: '4831',
  },

  // ── Credit Unions ────────────────────────────────────────────────────────
  {
    name: 'Pentagon Federal Credit Union',
    ofxUrl: 'https://ofx.penfed.org/OFXServer/ofxsrvr.dll',
    org: 'PenFed',
    fid: '10176',
  },
  {
    name: 'State Employees Credit Union (NC)',
    ofxUrl: 'https://onlineaccess.ncsecu.org/OFXServer/ofxsrvr.dll',
    org: 'NCSECU',
    fid: '1001',
  },
  {
    name: 'SchoolsFirst Federal Credit Union',
    ofxUrl: 'https://ofx.schoolsfirstfcu.org/OFXServer/ofxsrvr.dll',
    org: 'SchoolsFirst FCU',
    fid: '11668',
  },
  {
    name: 'Golden 1 Credit Union',
    ofxUrl: 'https://homebanking.golden1.com/ofx/OFXServlet',
    org: 'Golden1',
    fid: '1001',
  },
  {
    name: 'Alliant Credit Union',
    ofxUrl: 'https://ofx.alliantcreditunion.org/OFXServer/ofxsrvr.dll',
    org: 'Alliant CU',
    fid: '11278',
  },
  {
    name: 'Digital Federal Credit Union (DCU)',
    ofxUrl: 'https://ofx.dfrcu.org/OFXServer/ofxsrvr.dll',
    org: 'DCU',
    fid: '1001',
  },
  {
    name: 'First Tech Federal Credit Union',
    ofxUrl: 'https://ofx.firsttechfed.com/OFXServer/ofxsrvr.dll',
    org: 'First Tech FCU',
    fid: '3169',
  },
  {
    name: 'Star One Credit Union',
    ofxUrl: 'https://ofx.starone.org/OFXServer/ofxsrvr.dll',
    org: 'Star One CU',
    fid: '11552',
  },
  {
    name: 'Utah Community Credit Union (UCCU)',
    ofxUrl: 'https://ofx.uccu.com/OFXServer/ofxsrvr.dll',
    org: 'UCCU',
    fid: '1001',
  },

  // ── Online/Fintech Banks ─────────────────────────────────────────────────
  {
    name: 'Marcus by Goldman Sachs',
    ofxUrl: 'https://ofx.marcus.com/ofx/ofx.html',
    org: 'Marcus',
    fid: '15201',
  },
  {
    name: 'Synchrony Bank',
    ofxUrl: 'https://ofx.synchronybank.com/ofx/ofx.html',
    org: 'Synchrony',
    fid: '11176',
  },
  {
    name: 'Barclays US',
    ofxUrl: 'https://ofx.barclaysus.com/ofx/ofx.html',
    org: 'Barclays',
    fid: '21027',
  },

  // ── Brokerage / Investment ───────────────────────────────────────────────
  {
    name: 'TD Ameritrade',
    ofxUrl: 'https://ofxs.ameritrade.com/cgi-bin/apps/OFX',
    org: 'ameritrade.com',
    fid: '5024',
  },
  {
    name: 'Merrill Lynch',
    ofxUrl: 'https://olbp.mercurye.ml.com/OFXDirectConnect/OFXDirectConnectServlet',
    org: 'Merrill Lynch',
    fid: '5550',
  },
  {
    name: 'T. Rowe Price',
    ofxUrl: 'https://www3.troweprice.com/hbx/ofx/ofx.do',
    org: 'T. Rowe Price',
    fid: '10666',
  },
  {
    name: 'TIAA',
    ofxUrl: 'https://ofx.tiaa.org/OFXServer/ofxsrvr.dll',
    org: 'TIAA',
    fid: '1304',
  },
];

/**
 * Search banks by name (case-insensitive partial match).
 */
export function searchBanks(query: string): OFXBank[] {
  if (!query.trim()) return OFX_BANKS;
  const q = query.toLowerCase();
  return OFX_BANKS.filter((b) => b.name.toLowerCase().includes(q));
}
