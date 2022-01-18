import { Transfer } from "@dhis2/ui";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import { useState } from "react";
import { Future } from "../../../domain/entities/Future";
import { User } from "../../../domain/entities/User";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";

export interface UserRolesSelectorProps {
  users:User[];
  onCancel:()=>void;
}

export const UserRolesSelector: React.FC<UserRolesSelectorProps> = props => {
  const { compositionRoot } = useAppContext();
  const [selected, setSelected] = useState(["username","firstName","surname","email","dataViewOrganisationUnits","lastLogin","disabled","created"]);

  console.log(compositionRoot.users.getCurrent());

  const onChange = (payload:{ selected: string[] }) => setSelected(payload.selected)
  const userRoles=[
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
    {label: "Disabled", value: "disabled"}];

  return (
    <ConfirmationDialog
      isOpen={true}
      title={getTitle(props.users)} //todo:+" "+user.name
      onCancel={props.onCancel}
      maxWidth={"lg"}
      fullWidth={true}
      onSave={()=>{/*todo*/}}
    >
      <Transfer  //todo implement search role by name
        options={userRoles}
        selected={selected}
        onChange={onChange}
        filterable={true}
        filterablePicked={true}
        selectedWidth="100%"
        optionsWidth="100%"
        height="400px"
        />
  </ConfirmationDialog>)};

  const getPayload=():void=>{}

  const getTitle=(users:User[]):string=>{
    const usernames = users && users.map(user => user.username);
    return i18n.t("Assign roles") + users[0]?.username;
  }
