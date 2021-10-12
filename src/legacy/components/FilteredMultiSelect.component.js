import React from "react";
import PropTypes from "prop-types";
import TextField from "material-ui/TextField/TextField";

import MultiSelect from "./MultiSelect.component";

class FilteredMultiSelectComponent extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.onFilterTextChange = this.onFilterTextChange.bind(this);
        this.state = { filterText: "" };
    }

    styles = {
        contents: {
            padding: 15,
            position: "relative",
            height: 450,
            minHeight: 450,
            maxHeight: 450,
            minWidth: 800,
        },
    };

    onFilterTextChange(event) {
        this.setState({ filterText: event.target.value });
    }

    render = () => {
        const { options, selected, onChange } = this.props;
        const { filterText } = this.state;

        return (
            <div style={this.styles.contents}>
                <TextField
                    style={{ marginLeft: 15, marginTop: 5, marginBottom: -15 }}
                    value={filterText}
                    onChange={this.onFilterTextChange}
                    type="search"
                    hintText={this.getTranslation("search")}
                />

                <MultiSelect
                    isLoading={false}
                    options={options}
                    onChange={onChange}
                    selected={selected}
                    filterText={filterText}
                />
            </div>
        );
    };
}

FilteredMultiSelectComponent.propTypes = {
    options: PropTypes.arrayOf(PropTypes.object).isRequired,
    selected: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
};

FilteredMultiSelectComponent.contextTypes = {
    d2: PropTypes.object.isRequired,
};

export default FilteredMultiSelectComponent;
