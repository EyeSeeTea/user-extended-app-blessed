import React from 'react';
import Dialog from 'material-ui/Dialog/Dialog';
import FlatButton from 'material-ui/FlatButton/FlatButton';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import LoadingMask from 'd2-ui/lib/loading-mask/LoadingMask.component';
import TextField from 'material-ui/TextField/TextField';
import MultiSelect from '../MultiSelect.component';
import UserRolesDialogModel from './UserRolesDialog.model';
import snackActions from '../../Snackbar/snack.actions';
import Toggle from 'material-ui/Toggle/Toggle';
import PropTypes from 'prop-types';

export default class UserRolesDialog extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.model = new UserRolesDialogModel(context.d2);
        this.state = {
            state: "loading",
            users: null,
            allUserRoles: null,
            selectedIds: null,
            filterText: "",
            updateStrategy: this.props.users.length > 1 ? "merge" : "replace",
        };
    }

    styles = {
        dialog: {
            minWidth: 875, maxWidth: '100%',
        },
        contents: {
            padding: 15,
            position: 'relative',
            height: 450, minHeight: 450, maxHeight: 450,
            minWidth: 800,
        },
        loadingMask: {
            position: 'fixed',
            top: 54, right: 22,
            width: 480,
            height: 250,
            background: 'rgba(255,255,255,0.6)',
            zIndex: 5,
        },
        controls: {
            position: 'fixed',
            top: 156, right: 24,
            width: 475,
            zIndex: 1,
            background: 'white',
        },
        cancelButton: {
            marginRight: 16,
        },
    };

    componentDidMount() {
        const {users} = this.props;
        const {model} = this;

        return Promise.all([model.getAllUserRoles(), model.getUsers(users)])
            .then(([allUserRoles, usersLoaded]) =>
                this.setState({
                    state: "ready",
                    users: usersLoaded,
                    allUserRoles,
                    selectedIds: this.model.getSelectedRoles(usersLoaded).map(role => role.id),
                }))
            .catch(err =>
                this.close(this.getTranslation('error_loading_data') + " :" + err.toString()));
    }

    close(snackMessage = null) {
        if (snackMessage)
            snackActions.show({message: snackMessage});
        this.props.onRequestClose();
    }

    limitedJoin(strings, maxItems, joinString) {
        const base = _(strings).take(maxItems).join(joinString);
        return strings.length <= maxItems ? base :
             this.getTranslation("this_and_n_others", {"this": base, "n": strings.length - maxItems});
    }

    renderStrategyToggle() {
        if (this.state.users && this.state.users.length > 1) {
            const label = this.getTranslation('update_strategy') + ": " +
                this.getTranslation('update_strategy_' + this.state.updateStrategy);

            return (
                <Toggle
                    label={label}
                    style={{width: 300, float: "right", marginTop: 20, marginRight: 15}}
                    checked={this.state.updateStrategy === "replace"}
                    onToggle={(ev, newValue) => this.setState({updateStrategy: newValue ? "replace" : "merge"})}
                />
            );
        } else {
            return null;
        }
    }

    save() {
        this.model.save(this.state.users, this.state.selectedIds, this.state.updateStrategy)
            .then(() => this.close(this.getTranslation('user_roles_assigned')))
            .catch(err => this.close(this.getTranslation('user_roles_assign_error') + " :" + err.toString()));
    }

    onChange(selectedIds) {
        this.setState({selectedIds});
    }

    render() {
        switch (this.state.state) {
            case "loading":
                return (<div style={this.styles.loadingMask}><LoadingMask /></div>);
            case "error":
                return (<div style={this.styles.loadingMask}>{this.state.error}</div>);
            case "ready":
                return this.renderForm();
            default:
                throw new Error(`Unknown state: ${state}`);
        }
    }

    onFilterTextChange(event) {
        this.setState({filterText: event.target.value});
    }

    getDialogButtons() {
        return [
            <FlatButton
                label={this.getTranslation('cancel')}
                onClick={this.props.onRequestClose}
                style={this.styles.cancelButton}
            />,
            <RaisedButton
                primary
                label={this.getTranslation('save')}
                onClick={this.save.bind(this)}
            />,
        ];
    }

    render() {
        const isLoading = this.state.state === "loading";
        const {users, allUserRoles, filterText, selectedIds} = this.state;
        const usernames = isLoading ? 'Loading...' : users.map(user => user.userCredentials.username);
        const title = this.getTranslation('assignRoles') + ": " + this.limitedJoin(usernames || [], 3, ", ");
        const options = _(allUserRoles || []).sortBy("displayName")
            .map(role => ({value: role.id, text: role.displayName})).value();

        return (
            <Dialog
                title={title}
                actions={this.getDialogButtons()}
                autoScrollBodyContent
                autoDetectWindowHeight
                contentStyle={this.styles.dialog}
                open={true}
            >
                <TextField
                    style={{marginLeft: 15, marginTop: 5, marginBottom: -15}}
                    value={filterText}
                    onChange={this.onFilterTextChange.bind(this)}
                    type="search"
                    hintText={`${this.getTranslation('search_by_name')}`}
                />

                {this.renderStrategyToggle()}

                <div style={this.styles.contents}>
                    <MultiSelect
                        isLoading={isLoading}
                        options={options}
                        onChange={this.onChange.bind(this)}
                        selected={selectedIds}
                        filterText={filterText}
                    />
                </div>
            </Dialog>
        );
    }
}

UserRolesDialog.propTypes = {
    users: PropTypes.arrayOf(PropTypes.object).isRequired,
    onRequestClose: PropTypes.func.isRequired,
};

UserRolesDialog.contextTypes = {
    d2: PropTypes.object.isRequired,
};