/* @flow */

import React, { Component, PropTypes } from 'react';
import createStoreShape from '../store/createStoreShape';
import shallowEqual from '../utils/shallowEqual';
import { graphql } from 'graphql';

export default class GraphQLConnector extends Component {
  static contextTypes = {
    store: createStoreShape(PropTypes).isRequired,
    schema: PropTypes.object.isRequired,
  }

  static propTypes = {
    children: PropTypes.func.isRequired,
    select: PropTypes.func.isRequired,
    query: PropTypes.string.isRequired,
    variables: PropTypes.object.isRequired,
  }

  static defaultProps = {
    select: state => state,
  }

  constructor(props, context) {
    super(props, context);
    this.state = this.selectState(props, context);
  }

  componentDidMount() {
    const { store } = this.context;
    this.unsubscribe = store.subscribe(this.handleChange.bind(this));
    this.handleChange();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.variables !== this.props.variables) {
      this.handleChange(nextProps);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !this.isSliceEqual(this.state.slice, nextState.slice) ||
           !shallowEqual(this.props, nextProps);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  isSliceEqual(slice, nextSlice) {
    const isRefEqual = slice === nextSlice;
    if (isRefEqual) {
      return true;
    } else if (typeof slice !== 'object' || typeof nextSlice !== 'object') {
      return isRefEqual;
    }
    return shallowEqual(slice, nextSlice);
  }

  handleChange(props = this.props) {
    this.selectState(props, this.context)
      .then(nextState => {
        if (!this.isSliceEqual(this.state.slice, nextState.slice)) {
          this.setState(nextState);
        }
      })
      .catch(err => console.error(err.message, err.stack));
  }

  selectState(props, context) {
    const state = context.store.getState();

    const { schema } = this.context;
    const { query, variables } = props;

    return graphql(schema, query, state, variables)
      .then(({ data: slice }) => ({ slice }));
  }

  render() {
    const { children } = this.props;
    const { slice } = this.state;
    const { dispatch } = this.context.store;

    return children({ dispatch, ...slice });
  }
}
