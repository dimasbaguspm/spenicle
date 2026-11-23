package handlers

import (
	"errors"
	"fmt"
	"reflect"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

// Reflection helpers for the binding layer. Small on purpose: they only move strings
// onto string, int64 and time.Time fields, which is all a query string or a path value
// can carry.

const (
	kindPtr    = reflect.Ptr
	kindStruct = reflect.Struct
	kindString = reflect.String
	kindInt64  = reflect.Int64
)

// timeType is the only struct this binder converts: the wire format of a calendar day.
var timeType = reflect.TypeOf(time.Time{}) //nolint:gochecknoglobals // a type, read-only

// reflectValue unwraps one pointer so field indexing works.
func reflectValue(target any) reflect.Value { return reflect.ValueOf(target) }

// setField assigns one raw string to a supported field type.
func setField(field reflect.Value, raw string) error {
	if !field.CanSet() {
		return errors.New("field is not settable")
	}

	switch {
	case field.Kind() == kindString:
		field.SetString(raw)
	case field.Kind() == kindInt64:
		parsed, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return fmt.Errorf("%q is not an integer", raw)
		}

		field.SetInt(parsed)
	case field.Type() == timeType:
		parsed, err := time.Parse(constant.DateLayout, raw)
		if err != nil {
			return fmt.Errorf("%q is not %s", raw, constant.DateLayout)
		}

		field.Set(reflect.ValueOf(parsed))
	default:
		return fmt.Errorf("unsupported field type %s", field.Type())
	}

	return nil
}
