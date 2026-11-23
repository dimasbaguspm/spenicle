// Package binding copies raw strings from a query string or a path value onto a
// struct's fields, then hands it to the caller's validator.
package binding

import (
	"errors"
	"fmt"
	"reflect"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

const (
	kindPtr    = reflect.Ptr
	kindStruct = reflect.Struct
	kindString = reflect.String
	kindInt64  = reflect.Int64
)

var timeType = reflect.TypeOf(time.Time{}) //nolint:gochecknoglobals // a type, read-only

func Fill(target any, tag string, lookup func(string) (string, bool)) error {
	inspect := reflect.ValueOf(target)
	if inspect.Kind() != kindPtr || inspect.Elem().Kind() != kindStruct {
		return errors.New("bind target must be a pointer to a struct")
	}

	element := inspect.Elem()

	for index := range element.NumField() {
		field := element.Type().Field(index)
		name := field.Tag.Get(tag)

		if name == "" {
			continue
		}

		raw, ok := lookup(name)
		if !ok {
			continue
		}

		if err := setField(element.Field(index), raw); err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
	}

	return nil
}

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
