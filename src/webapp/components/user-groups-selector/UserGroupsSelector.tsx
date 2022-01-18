import { Transfer, TransferProps } from "@dhis2/ui";
import { useState } from "react";

interface UserRolesSelectorProps {

}

export const UserRolesSelector = ({ ...args }: UserRolesSelectorProps) => {
  const [selected, setSelected] = useState(["username","firstName","surname","email","dataViewOrganisationUnits","lastLogin","disabled","created"]);
  const onChange = (payload:{ selected: string[] }) => setSelected(payload.selected)

  return <Transfer {...args}
    dataTest="dhis2-uicore-transfer"
    selected={selected}
    onChange={onChange}
    enableOrderChange={true}
    filterable={true}
    filterablePicked={true}
    selectedWidth="100%"
    optionsWidth="100%"
    height="400px"
    options={[
      {label: "Username", value: "username"},
      {label: "First name", value: "firstName"},
      {label: "Surname", value: "surname"},
      {label: "Email", value: "email"},
      {label: "Open ID", value: "openId"},
      {label: "Created", value: "created"},
      {label: "Last updated", value: "lastUpdated"},
      {label: "API URL", value: "apiUrl"},
      {label: "Roles", value: "userRoles"},
      {label: "Groups", value: "userGroups"},
      {label: "Organisation units", value: "organisationUnits"},
      {label: "Data view organisation units", value: "dataViewOrganisationUnits"},
      {label: "Last login", value: "lastLogin"},
      {label: "Disabled", value: "disabled"}]}/>
};
