import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';

/* ══════════════════════════════════════
   LUNO CRM Customers — 1:1 replica
   ══════════════════════════════════════ */

/* ── Layout primitives ── */

const Page = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.md}px;`;

const Breadcrumb = styled.ol`
  list-style: none; margin: 0; padding: 0; display: flex; gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before { content: '/'; margin-right: ${({ theme }) => theme.spacing.sm}px; }
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; }
`;

const ToolbarRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
`;

const PageTitle = styled.h1`
  font-size: 1.15rem; font-weight: 600; margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PageSub = styled.small`
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

const StatsRow = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing.lg}px;
  ${media.mobile} {
    flex-wrap: wrap;
    gap: 12px;
  }
`;

const StatItem = styled.div`text-align: right;`;

const StatValue = styled.div`font-size: 1rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary};`;

const StatChange = styled.small<{ $up: boolean }>`
  font-size: 0.75rem; margin-left: 4px;
  color: ${({ $up, theme }) => $up ? theme.colors.green : theme.colors.red};
`;

const StatLabel = styled.div`
  font-size: 0.6875rem; text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const CardBody = styled.div`padding: ${({ theme }) => theme.spacing.md}px;`;

/* ── Search bar + Add button ── */

const SearchRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: ${({ theme }) => theme.spacing.sm}px;
  ${media.mobile} {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.875rem; outline: none; min-width: 240px;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
  &:focus { border-color: ${({ theme }) => theme.colors.blue}; }
`;

const PrimaryBtn = styled.button`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: none; border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.blue}; color: #fff;
  font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  &:hover { opacity: 0.85; }
`;

/* ── Table ── */

const TableWrap = styled.div`overflow-x: auto;`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; font-size: 0.8125rem;
  min-width: 800px;
  th, td {
    padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
    text-align: left; white-space: nowrap;
  }
  th {
    font-weight: 600; text-transform: uppercase; font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textTertiary};
    border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  }
`;

const TRow = styled.tr<{ $even?: boolean }>`
  background: ${({ $even, theme }) => $even ? theme.colors.surfaceMuted : theme.colors.surface};
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
  td { border-bottom: 1px solid ${({ theme }) => theme.colors.border}; }
`;

const Avatar = styled.img`
  width: 40px; height: 40px; border-radius: 50%; object-fit: cover;
  margin-right: ${({ theme }) => theme.spacing.sm}px; vertical-align: middle;
`;

const NameCell = styled.div`
  display: flex; align-items: center;
`;

const ActionBtn = styled.button<{ $color: string }>`
  width: 30px; height: 30px; border: none; border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ $color }) => $color}18;
  color: ${({ $color }) => $color};
  cursor: pointer; margin-right: 4px; font-size: 0.8rem;
  display: inline-flex; align-items: center; justify-content: center;
  &:hover { background: ${({ $color }) => $color}30; }
`;

/* ── Modal ── */

const Overlay = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
  box-shadow: 0 8px 30px rgba(0,0,0,0.18);
  ${media.mobile} {
    width: 95%;
    margin: 20px auto;
    max-height: 90vh;
  }
`;

const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  h2 { margin: 0; font-size: 1rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const CloseBtn = styled.button`
  background: none; border: none; font-size: 1.25rem; cursor: pointer;
  color: ${({ theme }) => theme.colors.textTertiary};
  &:hover { color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const ModalBody = styled.div`
  padding: ${({ theme }) => theme.spacing.lg}px;
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.md}px;
`;

const FormRow = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: ${({ theme }) => theme.spacing.md}px;
`;

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 4px;
`;

const Label = styled.label`
  font-size: 0.75rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.sm}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem; outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  &:focus { border-color: ${({ theme }) => theme.colors.blue}; }
`;

const Select = styled.select`
  padding: ${({ theme }) => theme.spacing.sm}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem; outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  &:focus { border-color: ${({ theme }) => theme.colors.blue}; }
`;

const TextArea = styled.textarea`
  padding: ${({ theme }) => theme.spacing.sm}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem; outline: none; resize: vertical; min-height: 60px;
  color: ${({ theme }) => theme.colors.textPrimary};
  &:focus { border-color: ${({ theme }) => theme.colors.blue}; }
`;

const ModalFooter = styled.div`
  display: flex; justify-content: flex-end; gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const SecondaryBtn = styled.button`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface}; color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.8125rem; cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
`;

/* ── Footer ── */

const Footer = styled.footer`
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; margin-left: ${({ theme }) => theme.spacing.md}px; }
  a:hover { text-decoration: underline; }
`;

/* ── Static data ── */

interface Customer {
  id: number;
  name: string;
  avatar: string;
  mobile: string;
  email: string;
  joinDate: string;
  address: string;
}

const CUSTOMERS: Customer[] = [
  { id: 1, name: 'Chris Fox',     avatar: '/avatars/avatar1.jpg',  mobile: '+14 1234 567 888', email: 'chris.fox@example.com',    joinDate: '12 April 2016',  address: '44 Shirley Ave. West Chicago, IL 60185' },
  { id: 2, name: 'Edit Toke',     avatar: '/avatars/avatar2.jpg',  mobile: '+14 1234 567 565', email: 'Toke.fox@example.com',     joinDate: '14 Nov 2020',    address: '123 6th St. Melbourne, FL 32904' },
  { id: 3, name: 'Manuella',      avatar: '/avatars/avatar3.jpg',  mobile: '+14 1234 567 999', email: 'Manuella.fox@example.com', joinDate: '22 Aug 2020',    address: '44 Shirley Ave. West Chicago, IL 60185' },
  { id: 4, name: 'Maryam Amiri',  avatar: '/avatars/avatar10.jpg', mobile: '+14 1234 567 343', email: 'Maryam.fox@example.com',   joinDate: '18 May 2017',    address: '70 Bowman St. South Windsor, CT 06074' },
  { id: 5, name: 'Brian Swader',  avatar: '/avatars/avatar9.jpg',  mobile: '+14 1234 567 666', email: 'Brian.fox@example.com',    joinDate: '12 Jun 2018',    address: '44 Shirley Ave. West Chicago, IL 60185' },
];

/* ── Component ── */

const Customers: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = CUSTOMERS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Page>
      {/* Breadcrumb */}
      <Breadcrumb>
        <li><a href="#">{t('common.home')}</a></li>
        <li>{t('customers.title')}</li>
      </Breadcrumb>

      {/* Toolbar */}
      <ToolbarRow>
        <div>
          <PageTitle>{t('dashboard.welcomeBack', { name: 'Allie' })}</PageTitle>
          <PageSub>{t('dashboard.newMessages', { msgCount: 12, notifCount: 7 })}</PageSub>
        </div>
        <StatsRow>
          <StatItem>
            <StatValue>$8.18K<StatChange $up>+1.3%</StatChange></StatValue>
            <StatLabel>{t('customers.income')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>$1.11K<StatChange $up>+4.1%</StatChange></StatValue>
            <StatLabel>{t('customers.expense')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>$3.66K<StatChange $up={false}>-7.5%</StatChange></StatValue>
            <StatLabel>{t('customers.revenue')}</StatLabel>
          </StatItem>
        </StatsRow>
      </ToolbarRow>

      {/* Search + Add */}
      <Card>
        <CardBody>
          <SearchRow>
            <SearchInput
              placeholder={t('customers.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <PrimaryBtn onClick={() => setModalOpen(true)}>{t('customers.addNew')}</PrimaryBtn>
          </SearchRow>
        </CardBody>
      </Card>

      {/* Customer Table */}
      <Card>
        <CardBody>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>{t('customers.id')}</th>
                  <th>{t('customers.customerName')}</th>
                  <th>{t('customers.mobile')}</th>
                  <th>{t('customers.email')}</th>
                  <th>{t('customers.join')}</th>
                  <th>{t('customers.address')}</th>
                  <th>{t('customers.action')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <TRow key={c.id} $even={i % 2 === 1}>
                    <td>{c.id}</td>
                    <td>
                      <NameCell>
                        <Avatar src={c.avatar} alt={c.name} />
                        {c.name}
                      </NameCell>
                    </td>
                    <td>{c.mobile}</td>
                    <td>{c.email}</td>
                    <td>{c.joinDate}</td>
                    <td>{c.address}</td>
                    <td>
                      <ActionBtn $color="#c9a055" title={t('customers.favorite')}>&#9733;</ActionBtn>
                      <ActionBtn $color="#7fb5ba" title={t('customers.settings')}>&#9881;</ActionBtn>
                      <ActionBtn $color="#c4735c" title={t('customers.delete')}>&#128465;</ActionBtn>
                    </td>
                  </TRow>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#969ba0' }}>
                      {t('customers.noMatch')}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableWrap>
        </CardBody>
      </Card>

      {/* Add Customer Modal */}
      {modalOpen && (
        <Overlay onClick={() => setModalOpen(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>{t('customers.addCustomer')}</h2>
              <CloseBtn onClick={() => setModalOpen(false)}>&times;</CloseBtn>
            </ModalHeader>
            <ModalBody>
              <FormRow>
                <FormGroup>
                  <Label>{t('customers.firstName')}</Label>
                  <Input placeholder={t('customers.enterFirstName')} />
                </FormGroup>
                <FormGroup>
                  <Label>{t('customers.lastName')}</Label>
                  <Input placeholder={t('customers.enterLastName')} />
                </FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup>
                  <Label>{t('customers.dateOfBirth')}</Label>
                  <Input type="date" />
                </FormGroup>
                <FormGroup>
                  <Label>{t('customers.bankDetails')}</Label>
                  <Input placeholder={t('customers.enterBankDetails')} />
                </FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup>
                  <Label>{t('customers.customerType')}</Label>
                  <Select>
                    <option value="regular">{t('customers.regular')}</option>
                    <option value="vip">{t('customers.vip')}</option>
                    <option value="vendors">{t('customers.vendors')}</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>{t('customers.gender')}</Label>
                  <Select>
                    <option value="male">{t('customers.male')}</option>
                    <option value="female">{t('customers.female')}</option>
                  </Select>
                </FormGroup>
              </FormRow>
              <FormGroup>
                <Label>{t('customers.address')}</Label>
                <TextArea placeholder={t('customers.enterAddress')} />
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <SecondaryBtn onClick={() => setModalOpen(false)}>{t('common.close')}</SecondaryBtn>
              <PrimaryBtn onClick={() => setModalOpen(false)}>{t('common.submit')}</PrimaryBtn>
            </ModalFooter>
          </Modal>
        </Overlay>
      )}

      {/* Footer */}
      <Footer>
        <span>{t('footer.copyrightHermes', { year: 2024 })}</span>
        <div>
          <a href="#">{t('footer.documentation')}</a>
          <a href="#">{t('footer.support')}</a>
          <a href="#">{t('footer.faqs')}</a>
        </div>
      </Footer>
    </Page>
  );
};

export default Customers;
